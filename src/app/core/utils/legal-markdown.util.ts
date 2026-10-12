/**
 * The small Markdown subset legal documents are written in: `## Heading`, `### Subheading`, paragraphs,
 * `- ` and `1. ` lists and `**bold**`. Parsed into blocks rendered by the template, so no HTML is injected.
 */
export interface LegalSegment {
  text: string;
  bold: boolean;
}

export type LegalBlock =
  | { kind: 'h2'; id: string; number: number; segments: LegalSegment[]; text: string }
  | { kind: 'h3'; segments: LegalSegment[] }
  | { kind: 'p'; segments: LegalSegment[] }
  | { kind: 'ul' | 'ol'; items: LegalSegment[][] };

export function parseLegalMarkdown(source: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  let paragraph: string[] = [];
  let list: { kind: 'ul' | 'ol'; items: LegalSegment[][] } | null = null;
  let headingNumber = 0;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: 'p', segments: segments(paragraph.join(' ')) });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  for (const raw of (source ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    const h2 = line.match(/^##\s+(.+)$/);
    const h3 = line.match(/^###\s+(.+)$/);
    const bullet = line.match(/^[-*•]\s+(.+)$/);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);

    if (!line) {
      flushParagraph();
      flushList();
    } else if (h3) {
      flushParagraph();
      flushList();
      blocks.push({ kind: 'h3', segments: segments(h3[1]) });
    } else if (h2) {
      flushParagraph();
      flushList();
      headingNumber++;
      const text = h2[1].replace(/\*\*/g, '');
      blocks.push({ kind: 'h2', id: `section-${headingNumber}`, number: headingNumber, segments: segments(h2[1]), text });
    } else if (bullet || numbered) {
      flushParagraph();
      const kind = bullet ? 'ul' : 'ol';
      if (list && list.kind !== kind) {
        flushList();
      }
      list ??= { kind, items: [] };
      list.items.push(segments((bullet ?? numbered)![1]));
    } else {
      flushList();
      paragraph.push(line.replace(/^#\s+/, ''));
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}

function segments(text: string): LegalSegment[] {
  return text.split(/(\*\*[^*]+\*\*)/g)
    .filter((part) => part !== '')
    .map((part) => part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? { text: part.slice(2, -2), bold: true }
      : { text: part, bold: false });
}
