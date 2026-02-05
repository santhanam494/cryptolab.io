const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running"));


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Remove spaces and non-alphabetic characters (except for certain cases)
function prepareText(text, removeSpaces = true) {
    if (removeSpaces) {
        return text.replace(/\s+/g, '');
    }
    return text;
}

// Vigenère Cipher Implementation
function vigenereCipher(text, key, mode) {
    const preparedText = prepareText(text);
    const preparedKey = key.toUpperCase().replace(/[^A-Z]/g, '');
    
    if (!preparedKey) {
        throw new Error('Key must contain at least one letter');
    }
    
    let result = '';
    let keyIndex = 0;
    
    for (let i = 0; i < preparedText.length; i++) {
        const char = preparedText[i];
        
        if (/[A-Za-z]/.test(char)) {
            const isUpperCase = char === char.toUpperCase();
            const charCode = char.toUpperCase().charCodeAt(0) - 65;
            const keyChar = preparedKey[keyIndex % preparedKey.length];
            const keyCode = keyChar.charCodeAt(0) - 65;
            
            let shiftedCode;
            
            if (mode === 'encrypt') {
                shiftedCode = (charCode + keyCode) % 26;
            } else {
                shiftedCode = (charCode - keyCode + 26) % 26;
            }
            
            const shiftedChar = String.fromCharCode(shiftedCode + 65);
            result += isUpperCase ? shiftedChar : shiftedChar.toLowerCase();
            
            keyIndex++;
        } else {
            // For non-alphabet characters in prepared text (should be rare)
            result += char;
        }
    }
    
    return result;
}

// Playfair Cipher Implementation
function generatePlayfairMatrix(keyword) {
    let key = keyword.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    let keySet = new Set(key);
    let alphabet = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
    let matrix = [];
    
    for (let char of keySet) {
        matrix.push(char);
    }
    
    for (let char of alphabet) {
        if (!keySet.has(char)) {
            matrix.push(char);
        }
    }
    
    return matrix.slice(0, 25);
}

function playfairCipher(text, key, mode) {
    // Remove spaces and prepare text
    let preparedText = prepareText(text).toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    
    if (!preparedText) {
        throw new Error('Message must contain at least one letter');
    }
    
    // Generate matrix
    const matrix = generatePlayfairMatrix(key);
    
    // Prepare digraphs
    let digraphs = [];
    
    // Insert X between double letters
    for (let i = 0; i < preparedText.length; i += 2) {
        if (i + 1 < preparedText.length) {
            if (preparedText[i] === preparedText[i + 1]) {
                preparedText = preparedText.substring(0, i + 1) + 'X' + preparedText.substring(i + 1);
            }
        }
    }
    
    // Make length even
    if (preparedText.length % 2 !== 0) {
        preparedText += 'X';
    }
    
    // Create digraphs
    for (let i = 0; i < preparedText.length; i += 2) {
        digraphs.push(preparedText.substring(i, i + 2));
    }
    
    // Process each digraph
    let result = '';
    
    for (let digraph of digraphs) {
        const char1 = digraph[0];
        const char2 = digraph[1];
        
        // Find positions in matrix
        let pos1 = matrix.indexOf(char1);
        let pos2 = matrix.indexOf(char2);
        
        let row1 = Math.floor(pos1 / 5);
        let col1 = pos1 % 5;
        let row2 = Math.floor(pos2 / 5);
        let col2 = pos2 % 5;
        
        let newPos1, newPos2;
        
        if (row1 === row2) {
            // Same row
            if (mode === 'encrypt') {
                col1 = (col1 + 1) % 5;
                col2 = (col2 + 1) % 5;
            } else {
                col1 = (col1 + 4) % 5;
                col2 = (col2 + 4) % 5;
            }
            newPos1 = row1 * 5 + col1;
            newPos2 = row2 * 5 + col2;
        } else if (col1 === col2) {
            // Same column
            if (mode === 'encrypt') {
                row1 = (row1 + 1) % 5;
                row2 = (row2 + 1) % 5;
            } else {
                row1 = (row1 + 4) % 5;
                row2 = (row2 + 4) % 5;
            }
            newPos1 = row1 * 5 + col1;
            newPos2 = row2 * 5 + col2;
        } else {
            // Rectangle
            newPos1 = row1 * 5 + col2;
            newPos2 = row2 * 5 + col1;
        }
        
        result += matrix[newPos1] + matrix[newPos2];
    }
    
    return result;
}

// Affine Cipher Implementation
function modInverse(a, m) {
    a = a % m;
    for (let x = 1; x < m; x++) {
        if ((a * x) % m === 1) {
            return x;
        }
    }
    return 1;
}

function affineCipher(text, a, b, mode) {
    const preparedText = prepareText(text);
    
    // Validate a (must be coprime with 26)
    const validAValues = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
    if (!validAValues.includes(a)) {
        throw new Error('a must be coprime with 26. Valid values: 1,3,5,7,9,11,15,17,19,21,23,25');
    }
    
    let result = '';
    
    for (let i = 0; i < preparedText.length; i++) {
        const char = preparedText[i];
        
        if (/[A-Za-z]/.test(char)) {
            const isUpperCase = char === char.toUpperCase();
            const charCode = char.toUpperCase().charCodeAt(0) - 65;
            
            let newCharCode;
            
            if (mode === 'encrypt') {
                newCharCode = (a * charCode + b) % 26;
            } else {
                // Decryption: D(x) = a⁻¹(x - b) mod 26
                const aInverse = modInverse(a, 26);
                newCharCode = (aInverse * (charCode - b + 26)) % 26;
            }
            
            const newChar = String.fromCharCode(newCharCode + 65);
            result += isUpperCase ? newChar : newChar.toLowerCase();
        } else {
            // For non-alphabet characters in prepared text (should be rare)
            result += char;
        }
    }
    
    return result;
}

// API Routes
app.post('/api/vigenere', (req, res) => {
    try {
        const { text, key, mode } = req.body;
        
        if (!text || !key) {
            return res.json({ success: false, error: 'Text and key are required' });
        }
        
        if (mode !== 'encrypt' && mode !== 'decrypt') {
            return res.json({ success: false, error: 'Invalid mode' });
        }
        
        const result = vigenereCipher(text, key, mode);
        
        res.json({ success: true, result: result });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/api/playfair', (req, res) => {
    try {
        const { text, key, mode } = req.body;
        
        if (!text) {
            return res.json({ success: false, error: 'Text is required' });
        }
        
        if (mode !== 'encrypt' && mode !== 'decrypt') {
            return res.json({ success: false, error: 'Invalid mode' });
        }
        
        const effectiveKey = key || 'PLAYFAIREXAMPLE';
        const matrix = generatePlayfairMatrix(effectiveKey);
        const result = playfairCipher(text, effectiveKey, mode);
        
        res.json({ 
            success: true, 
            result: result,
            matrix: matrix
        });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

app.post('/api/affine', (req, res) => {
    try {
        const { text, a, b, mode } = req.body;
        
        if (!text || a === undefined || b === undefined) {
            return res.json({ success: false, error: 'Text, a, and b are required' });
        }
        
        if (mode !== 'encrypt' && mode !== 'decrypt') {
            return res.json({ success: false, error: 'Invalid mode' });
        }
        
        const result = affineCipher(text, parseInt(a), parseInt(b), mode);
        
        res.json({ success: true, result: result });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '1.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Cryptography Toolbox server running at http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
});
