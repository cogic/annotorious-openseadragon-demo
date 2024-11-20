import './LabelsFormatter.css';

const LabelsFormatter = (config) => (annotation) => {
  const bodies = Array.isArray(annotation.body) ? annotation.body : [annotation.body];

  const firstTag = bodies.find((b) => b.purpose == 'tagging');

  if (firstTag) {
    const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');

    // Overflow is set to visible, but the foreignObject needs >0 zero size,
    // otherwise FF doesn't render...
    foreignObject.setAttribute('width', '1px');
    foreignObject.setAttribute('height', '1px');

    foreignObject.innerHTML = `
      <div xmlns="http://www.w3.org/1999/xhtml" class="a8s-shape-label-wrapper">
        <div class="a8s-shape-label">
          ${firstTag.value.id}
        </div>
      </div>`;

    return {
      element: foreignObject,
      // className: firstTag.value.id,
    };
  }
};

export default LabelsFormatter;
