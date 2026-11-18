import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const androidAssetsDir = path.resolve(process.cwd(), 'android/app/src/main/assets/www');

if (!fs.existsSync(distDir)) {
  console.error('Erro: pasta dist/ não encontrada. Execute vite build primeiro.');
  process.exit(1);
}

fs.rmSync(androidAssetsDir, { recursive: true, force: true });
fs.mkdirSync(androidAssetsDir, { recursive: true });
fs.cpSync(distDir, androidAssetsDir, { recursive: true });
fs.rmSync(path.join(androidAssetsDir, 'assets', 'aistudio'), { recursive: true, force: true });

console.log(`Assets sincronizados com sucesso: ${distDir} -> ${androidAssetsDir}`);
