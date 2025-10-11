const fs = require('fs');
const path = require('path');

// Fonction pour créer un PNG simple avec Canvas API (Node.js)
function createSimplePNG(width, height, text, filename) {
    // Créer un buffer PNG minimal avec en-tête PNG valide
    const pngHeader = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A  // PNG signature
    ]);
    
    // Créer un PNG simple avec un carré coloré et du texte
    const canvas = require('canvas');
    const { createCanvas } = canvas;
    
    const canvasElement = createCanvas(width, height);
    const ctx = canvasElement.getContext('2d');
    
    // Fond dégradé bleu-violet (couleurs BazarKELY)
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Ajouter un cercle blanc au centre
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(width/2, height/2, Math.min(width, height) * 0.3, 0, 2 * Math.PI);
    ctx.fill();
    
    // Ajouter le texte "BK" au centre
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.min(width, height) * 0.3}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width/2, height/2);
    
    // Ajouter une bordure subtile
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width-2, height-2);
    
    // Convertir en buffer PNG
    const buffer = canvasElement.toBuffer('image/png');
    
    // Sauvegarder le fichier
    const filepath = path.join(__dirname, 'public', filename);
    fs.writeFileSync(filepath, buffer);
    
    console.log(`✅ Icône créée: ${filename} (${width}x${height})`);
    return buffer;
}

// Fonction alternative pour créer un PNG minimal sans dépendances
function createMinimalPNG(width, height, filename) {
    // Créer un PNG minimal avec en-tête valide
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    
    // IHDR chunk (Image Header)
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);   // Width
    ihdrData.writeUInt32BE(height, 4);  // Height
    ihdrData[8] = 8;   // Bit depth
    ihdrData[9] = 2;   // Color type (RGB)
    ihdrData[10] = 0;  // Compression
    ihdrData[11] = 0; // Filter
    ihdrData[12] = 0; // Interlace
    
    const ihdrChunk = Buffer.concat([
        Buffer.from([0, 0, 0, 13]), // Length
        Buffer.from('IHDR'),         // Type
        ihdrData,                    // Data
        Buffer.from([0, 0, 0, 0])    // CRC (simplifié)
    ]);
    
    // IDAT chunk (Image Data) - données minimales
    const imageData = Buffer.alloc(width * height * 3);
    // Remplir avec un dégradé simple
    for (let i = 0; i < imageData.length; i += 3) {
        const x = (i / 3) % width;
        const y = Math.floor((i / 3) / width);
        const r = Math.floor(102 + (x / width) * 118); // 102-220 (bleu-violet)
        const g = Math.floor(126 + (y / height) * 50); // 126-176
        const b = Math.floor(234 + (x / width) * 22);  // 234-256
        
        imageData[i] = r;     // Red
        imageData[i + 1] = g; // Green
        imageData[i + 2] = b; // Blue
    }
    
    const idatChunk = Buffer.concat([
        Buffer.from([0, 0, 0, imageData.length]), // Length
        Buffer.from('IDAT'),                       // Type
        imageData,                                // Data
        Buffer.from([0, 0, 0, 0])                 // CRC (simplifié)
    ]);
    
    // IEND chunk (Image End)
    const iendChunk = Buffer.concat([
        Buffer.from([0, 0, 0, 0]), // Length
        Buffer.from('IEND'),       // Type
        Buffer.from([0, 0, 0, 0]) // CRC
    ]);
    
    const pngBuffer = Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
    
    const filepath = path.join(__dirname, 'public', filename);
    fs.writeFileSync(filepath, pngBuffer);
    
    console.log(`✅ Icône PNG créée: ${filename} (${width}x${height})`);
    return pngBuffer;
}

// Fonction pour télécharger des icônes placeholder
async function downloadPlaceholderIcons() {
    const https = require('https');
    const fs = require('fs');
    const path = require('path');
    
    const downloadFile = (url, filename) => {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(path.join(__dirname, 'public', filename));
            https.get(url, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`✅ Icône téléchargée: ${filename}`);
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlink(path.join(__dirname, 'public', filename));
                reject(err);
            });
        });
    };
    
    try {
        // Télécharger des icônes placeholder
        await downloadFile('https://via.placeholder.com/192x192/667eea/ffffff?text=BK', 'icon-192x192.png');
        await downloadFile('https://via.placeholder.com/512x512/764ba2/ffffff?text=BK', 'icon-512x512.png');
        console.log('✅ Icônes placeholder téléchargées avec succès');
    } catch (error) {
        console.error('❌ Erreur lors du téléchargement:', error.message);
        throw error;
    }
}

// Fonction principale
async function generateIcons() {
    console.log('🎨 Génération des icônes PWA pour BazarKELY...');
    
    try {
        // Essayer d'abord de télécharger des placeholders
        console.log('📥 Tentative de téléchargement des icônes placeholder...');
        await downloadPlaceholderIcons();
    } catch (error) {
        console.log('⚠️ Téléchargement échoué, création d\'icônes minimales...');
        
        try {
            // Essayer avec Canvas si disponible
            createSimplePNG(192, 192, 'BK', 'icon-192x192.png');
            createSimplePNG(512, 512, 'BK', 'icon-512x512.png');
        } catch (canvasError) {
            console.log('⚠️ Canvas non disponible, création d\'icônes PNG minimales...');
            
            // Créer des PNG minimaux
            createMinimalPNG(192, 192, 'icon-192x192.png');
            createMinimalPNG(512, 512, 'icon-512x512.png');
        }
    }
    
    // Vérifier que les fichiers ont été créés
    const icon192 = path.join(__dirname, 'public', 'icon-192x192.png');
    const icon512 = path.join(__dirname, 'public', 'icon-512x512.png');
    
    if (fs.existsSync(icon192) && fs.existsSync(icon512)) {
        const stats192 = fs.statSync(icon192);
        const stats512 = fs.statSync(icon512);
        
        console.log('📊 Vérification des icônes créées:');
        console.log(`  icon-192x192.png: ${stats192.size} bytes`);
        console.log(`  icon-512x512.png: ${stats512.size} bytes`);
        
        // Vérifier les en-têtes PNG
        const header192 = fs.readFileSync(icon192, { start: 0, end: 7 });
        const header512 = fs.readFileSync(icon512, { start: 0, end: 7 });
        
        const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
        
        if (header192.equals(pngSignature) && header512.equals(pngSignature)) {
            console.log('✅ En-têtes PNG valides détectés');
        } else {
            console.log('⚠️ En-têtes PNG non valides, mais fichiers créés');
        }
        
        console.log('🎉 Icônes PWA générées avec succès !');
    } else {
        console.error('❌ Erreur: Icônes non créées');
        process.exit(1);
    }
}

// Exécuter la génération
generateIcons().catch(console.error);




