import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { createSyntaxDiagramsCode } from 'chevrotain';
import { parser } from './query.js';

const serializedGrammar = parser.getSerializedGastProductions();
const htmlText = createSyntaxDiagramsCode(serializedGrammar);
writeFileSync(resolve(import.meta.dirname, '..', 'generated_diagrams.html'), htmlText);
