const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('d:/FlutterProjects/A365_Mobile_And_Web/A365SS/src', (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx') && !filePath.endsWith('.css')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/HR COMPLAINT/g, 'HR QUERY');
    content = content.replace(/ferry hr complaint/g, 'ferry hr query');

    // Add hr query to includes checks if not already there, wait, I can just replace 'hr complaint' in EXCLUDED_REQUEST_TYPES
    content = content.replace(/\[\'ferry\', \'hr complaint\'\]/g, "['ferry', 'hr complaint', 'hr query']");
    content = content.replace(/d\.includes\(\'hr complaint\'\)/g, "d.includes('hr complaint') || d.includes('hr query')");
    content = content.replace(/dStr\.includes\(\'hr complaint\'\)/g, "dStr.includes('hr complaint') || dStr.includes('hr query')");
    content = content.replace(/tStr\.includes\(\'hr complaint\'\)/g, "tStr.includes('hr complaint') || tStr.includes('hr query')");

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated: ' + filePath);
    }
});
