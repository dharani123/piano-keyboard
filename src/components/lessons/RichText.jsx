// Tiny inline markup for lesson text: **bold**, *italic*, `key`
export default function RichText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return parts.map((part, i) => {
    if (part.startsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>;
    if (part.startsWith('`')) return <kbd key={i}>{part.slice(1, -1)}</kbd>;
    if (part.startsWith('*') && part.length > 2) return <i key={i}>{part.slice(1, -1)}</i>;
    return part;
  });
}
