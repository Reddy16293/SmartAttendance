document.addEventListener("DOMContentLoaded", function() {
  if (typeof mermaid !== 'undefined') {
    try {
      mermaid.initialize({ startOnLoad: true, theme: 'default' });
    } catch (e) {
      console.warn('Mermaid init failed:', e);
    }
  } else {
    console.warn('Mermaid not loaded');
  }
});
