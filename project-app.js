fetch('content.json')
  .then(function (r) { return r.json(); })
  .then(function (data) { renderProject(data); })
  .catch(function () {
    document.getElementById('app').innerHTML =
      '<p>Error loading content. Please try again later.</p>';
  });

function renderProject(data) {
  document.title = data.title + ' - Guru Subramani';

  var html = '';

  // Back link
  html += '<div class="back-link"><a href="../../index.html">← Back to Portfolio</a></div>';

  // Header
  html += '<header>';
  html += '<h1>' + data.title + '</h1>';
  html += '<div class="paper-meta">';
  html += '<div class="authors">' + data.meta.authors + '</div>';
  html += '<div class="venue">' + data.meta.venue + '</div>';
  html += '</div>';
  html += '</header>';

  // Main sections
  html += '<main>';
  data.sections.forEach(function (section) {
    html += '<section>';
    html += '<h2>' + section.title + '</h2>';
    html += renderBlocks(section.blocks);
    html += '</section>';
  });
  html += '</main>';

  // Footer
  html += '<footer>';
  html += '<div class="external-links">';
  if (data.footer) {
    html += '<a href="' + data.footer.paperUrl + '">' + data.footer.paperLabel + '</a> | ';
  }
  html += '<a href="../../index.html">Back to Portfolio</a>';
  html += '</div>';
  html += '<p>© 2026 Guru Subramani</p>';
  html += '</footer>';

  document.getElementById('app').innerHTML = html;
}

function renderBlocks(blocks) {
  var html = '';
  blocks.forEach(function (block) {
    if (block.type === 'paragraph') {
      html += '<p>' + block.text + '</p>';

    } else if (block.type === 'h3') {
      html += '<h3>' + block.text + '</h3>';

    } else if (block.type === 'figure') {
      html += '<div class="figure">';
      html += '<img src="' + block.src + '" alt="' + block.alt + '">';
      html += '<div class="figure-caption">' + block.caption + '</div>';
      html += '</div>';

    } else if (block.type === 'figure-grid') {
      html += '<div class="figure-grid">';
      block.figures.forEach(function (fig) {
        html += '<div class="figure">';
        html += '<img src="' + fig.src + '" alt="' + fig.alt + '">';
        html += '<div class="figure-caption">' + fig.caption + '</div>';
        html += '</div>';
      });
      html += '</div>';

    } else if (block.type === 'figure-strip') {
      html += '<div class="figure-strip">';
      block.figures.forEach(function (fig) {
        html += '<div class="figure">';
        html += '<img src="' + fig.src + '" alt="' + fig.alt + '">';
        html += '<div class="figure-caption">' + fig.caption + '</div>';
        html += '</div>';
      });
      html += '</div>';

    } else if (block.type === 'list') {
      html += '<ul>';
      block.items.forEach(function (item) {
        html += '<li>' + item + '</li>';
      });
      html += '</ul>';
    }
  });
  return html;
}
