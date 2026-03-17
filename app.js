fetch('content.json')
  .then(function (r) { return r.json(); })
  .then(function (data) { renderPage(data); })
  .catch(function () {
    document.getElementById('app').innerHTML =
      '<p>Error loading content. Please try again later.</p>';
  });

function renderPage(data) {
  var html = '';

  // Header
  var h = data.header;
  html += '<header>';
  html += '<div class="header-top"><div><h1>' + h.name + '</h1><p>' + h.title + '</p></div><address><a href="mailto:' + h.email + '">' + h.email + '</a></address></div>';
  html += '<p>' + h.bio + '</p>';
  html += '</header>';

  // Main sections
  html += '<main>';
  data.sections.forEach(function (section) {
    html += '<section>';
    html += '<h2>' + section.title + '</h2>';

    if (section.type === 'list') {
      html += '<ul class="interest-list">';
      section.items.forEach(function (item) {
        html += '<li><strong class="interest-label">' + item.label + '</strong><br><span class="interest-desc">' + item.description + '</span></li>';
      });
      html += '</ul>';
    }

    if (section.type === 'projects') {
      section.items.forEach(function (project) {
        html += '<div class="project-card">';
        html += '<img src="' + project.image + '" alt="' + project.title + '">';
        html += '<div class="project-card-content">';
        html += '<h3><a href="' + project.url + '">' + project.title + '</a></h3>';
        html += '<p>' + project.description + '</p>';
        html += '</div>';
        html += '</div>';
      });
    }

    if (section.type === 'publications') {
      html += '<p>Please visit my <a href="' + section.scholarUrl + '">Google Scholar profile</a> for a complete list of publications.</p>';
      html += '<ul>';
      section.items.forEach(function (pub) {
        html += '<li>';
        if (pub.url) {
          html += '<a href="' + pub.url + '"><strong>' + pub.title + '</strong></a>';
        } else {
          html += '<strong>' + pub.title + '</strong>';
        }
        html += ' (' + pub.year + ')';
        html += '<br>' + pub.authors;
        html += '<br><em>' + pub.venue + '</em>';
        html += '</li>';
      });
      html += '</ul>';
    }

    html += '</section>';
  });
  html += '</main>';

  document.getElementById('app').innerHTML = html;
}
