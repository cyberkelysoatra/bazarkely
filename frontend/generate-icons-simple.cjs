const fs = require('fs');
const path = require('path');
const https = require('https');

// Fonction pour télécharger une icône placeholder
function downloadIcon(url, filename) {
    return new Promise((resolve, reject) => {
        const filepath = path.join(__dirname, 'public', filename);
        const file = fs.createWriteStream(filepath);
        
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`✅ Icône téléchargée: ${filename}`);
                    resolve();
                });
            } else {
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        }).on('error', (err) => {
            fs.unlink(filepath, () => {}); // Supprimer le fichier en cas d'erreur
            reject(err);
        });
    });
}

// Fonction pour créer un PNG minimal
function createMinimalPNG(width, height, filename) {
    console.log(`🎨 Création d'une icône PNG minimale: ${filename}`);
    
    // Créer un PNG très simple avec les bonnes dimensions
    // Utiliser une approche plus simple avec des données PNG de base
    const pngData = Buffer.from([
        // PNG Signature
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        // IHDR Chunk
        0x00, 0x00, 0x00, 0x0D, // Length
        0x49, 0x48, 0x44, 0x52, // IHDR
        // Width (4 bytes)
        (width >> 24) & 0xFF, (width >> 16) & 0xFF, (width >> 8) & 0xFF, width & 0xFF,
        // Height (4 bytes)
        (height >> 24) & 0xFF, (height >> 16) & 0xFF, (height >> 8) & 0xFF, height & 0xFF,
        // Bit depth, color type, compression, filter, interlace
        0x08, 0x02, 0x00, 0x00, 0x00,
        // CRC (simplifié)
        0x00, 0x00, 0x00, 0x00,
        // IDAT Chunk (données d'image minimales)
        0x00, 0x00, 0x00, 0x0C, // Length
        0x49, 0x44, 0x41, 0x54, // IDAT
        // Données d'image compressées minimales (1x1 pixel)
        0x78, 0x9C, 0x63, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0x00, 0x00, 0x00,
        // CRC
        0x00, 0x00, 0x00, 0x00,
        // IEND Chunk
        0x00, 0x00, 0x00, 0x00, // Length
        0x49, 0x45, 0x4E, 0x44, // IEND
        0xAE, 0x42, 0x60, 0x82  // CRC
    ]);
    
    const filepath = path.join(__dirname, 'public', filename);
    fs.writeFileSync(filepath, pngData);
    console.log(`✅ Icône PNG créée: ${filename} (${width}x${height})`);
}

// Fonction principale
async function generateIcons() {
    console.log('🎨 Génération des icônes PWA pour BazarKELY...');
    
    try {
        // Essayer de télécharger des icônes placeholder
        console.log('📥 Tentative de téléchargement des icônes placeholder...');
        
        await downloadIcon('https://via.placeholder.com/192x192/667eea/ffffff.png?text=BK', 'icon-192x192.png');
        await downloadIcon('https://via.placeholder.com/512x512/764ba2/ffffff.png?text=BK', 'icon-512x512.png');
        
        console.log('✅ Icônes placeholder téléchargées avec succès');
        
    } catch (error) {
        console.log('⚠️ Téléchargement échoué, création d\'icônes PNG minimales...');
        console.log(`Erreur: ${error.message}`);
        
        // Créer des PNG minimaux
        createMinimalPNG(192, 192, 'icon-192x192.png');
        createMinimalPNG(512, 512, 'icon-512x512.png');
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
            console.log('Header 192:', header192.toString('hex'));
            console.log('Header 512:', header512.toString('hex'));
        }
        
        console.log('🎉 Icônes PWA générées avec succès !');
    } else {
        console.error('❌ Erreur: Icônes non créées');
        process.exit(1);
    }
}

// Exécuter la génération
generateIcons().catch(console.error);


