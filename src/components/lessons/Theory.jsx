import RichText from './RichText.jsx';
import MiniKeys from './MiniKeys.jsx';

export default function Theory({ blocks }) {
  return (
    <div className="theory">
      {blocks.map((block, i) => {
        if (typeof block === 'string') return <p key={i}><RichText text={block} /></p>;
        if (block.list) {
          return <ul key={i}>{block.list.map((item, j) => <li key={j}><RichText text={item} /></li>)}</ul>;
        }
        if (block.tip) return <p key={i} className="tip">💡 <RichText text={block.tip} /></p>;
        if (block.keys) {
          return (
            <figure key={i}>
              <MiniKeys {...block.keys} />
              {block.caption && <figcaption>{block.caption}</figcaption>}
            </figure>
          );
        }
        return null;
      })}
    </div>
  );
}
