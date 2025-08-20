// Side-effect: injects a utility to hide scrollbars (matches original behavior)
const styles = document.createElement("style");
styles.innerHTML = `
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;
document.head.appendChild(styles);
