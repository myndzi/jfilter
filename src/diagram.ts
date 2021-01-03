import { resolve } from 'path';
import { writeFileSync } from 'fs';
import { createSyntaxDiagramsCode } from 'chevrotain';
import { parser } from './query';

const serializedGrammar = parser.getSerializedGastProductions();
const htmlText = createSyntaxDiagramsCode(serializedGrammar);
writeFileSync(resolve(__dirname, '..', 'generated_diagrams.html'), htmlText);
