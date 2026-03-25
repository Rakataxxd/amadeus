import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LayoutTerminal } from '../shared/types.js';

const LAYOUTS_DIR = path.join(os.homedir(), '.amadeus', 'layouts');

export class LayoutStore {
  constructor() { if (!fs.existsSync(LAYOUTS_DIR)) fs.mkdirSync(LAYOUTS_DIR, { recursive: true }); }
  save(name: string, terminals: LayoutTerminal[]): void { fs.writeFileSync(path.join(LAYOUTS_DIR, `${name}.json`), JSON.stringify(terminals, null, 2), 'utf-8'); }
  load(name: string): LayoutTerminal[] { const p = path.join(LAYOUTS_DIR, `${name}.json`); if (!fs.existsSync(p)) return []; try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return []; } }
  list(): string[] { return fs.readdirSync(LAYOUTS_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')); }
}
