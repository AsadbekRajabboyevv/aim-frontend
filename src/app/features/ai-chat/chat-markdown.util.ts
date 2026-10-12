export function chatMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const inline = (line: string) => line
    .replace(/`([^`]+)`/g, '<code class="rounded bg-espresso-100/70 px-1 font-mono text-[13px]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');

  const html: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (list) {
      html.push(`</${list}>`);
      list = null;
    }
  };

  for (const raw of escaped.split('\n')) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        list = kind;
        html.push(kind === 'ul' ? '<ul class="my-1 list-disc space-y-0.5 pl-5">' : '<ol class="my-1 list-decimal space-y-0.5 pl-5">');
      }
      html.push(`<li>${inline((bullet ?? numbered)![1])}</li>`);
    } else if (line.trim() === '') {
      closeList();
      html.push('<div class="h-2"></div>');
    } else {
      closeList();
      html.push(`<p>${inline(line.replace(/^#{1,6}\s+/, ''))}</p>`);
    }
  }
  closeList();
  return html.join('');
}
