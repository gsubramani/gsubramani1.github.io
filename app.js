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
  
  // Robot Arm Animation (full-width strip below header)
  html += '<div class="robot-arm-container"><canvas id="robotArm"></canvas></div>';

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

  // Initialize robot arm canvas animation
  initRobotArm();
}

function initRobotArm() {
  var canvas = document.getElementById('robotArm');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = window.devicePixelRatio || 1;

  // Size canvas to fill container at retina resolution
  function sizeCanvas() {
    var rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  // Logical dimensions (CSS pixels)
  function getW() { return canvas.width / dpr; }
  function getH() { return canvas.height / dpr; }

  // Arm parameters
  var L1 = 48, L2 = 40;                      // link lengths
  var W1 = 10, W2 = 8;                       // link widths
  var gripLen = 12, gripW = 3;               // gripper finger size

  // Mobile base state
  var wheelRadius = 8;
  var baseWidth = 30;
  var baseHeight = 14;
  var chassisH = 6;
  var robotX = getW() - baseWidth;           // current horizontal position (start at right)
  var robotSpeed = 0;                        // current velocity
  var wheelAngle = 0;                        // cumulative wheel rotation

  var dark  = '#2F3337';
  var accent = '#A85A41';
  var accentLight = '#C4714E';
  var bg = '#FBF9F5';

  function drawRoundedLink(x, y, angle, length, width, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI);

    // Draw tapered rounded link
    var w1 = width;
    var w2 = width * 0.8;
    ctx.beginPath();
    ctx.moveTo(-w1 / 2, 0);
    ctx.lineTo(-w2 / 2, -length);
    ctx.arc(0, -length, w2 / 2, Math.PI, 0, false);
    ctx.lineTo(w1 / 2, 0);
    ctx.arc(0, 0, w1 / 2, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Subtle highlight on left edge
    ctx.beginPath();
    ctx.moveTo(-w1 / 2 + 1.5, -2);
    ctx.lineTo(-w2 / 2 + 1.5, -length + 4);
    ctx.strokeStyle = accentLight;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.restore();
  }

  function drawJoint(x, y, radius) {
    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = dark;
    ctx.fill();

    // Inner highlight
    ctx.beginPath();
    ctx.arc(x - radius * 0.2, y - radius * 0.2, radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#555';
    ctx.fill();
  }

  function drawGripper(x, y, angle, openAngle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI);

    // Gripper mount (small rectangle)
    ctx.fillStyle = dark;
    ctx.fillRect(-4, -3, 8, 6);

    // Left finger
    ctx.save();
    ctx.rotate(-openAngle);
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(-3.5, -gripLen);
    ctx.lineTo(-3.5 + gripW, -gripLen);
    ctx.lineTo(1, 0);
    ctx.closePath();
    ctx.fillStyle = dark;
    ctx.fill();
    // Finger tip pad
    ctx.beginPath();
    ctx.arc(-2, -gripLen, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.restore();

    // Right finger
    ctx.save();
    ctx.rotate(openAngle);
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(3.5, -gripLen);
    ctx.lineTo(3.5 - gripW, -gripLen);
    ctx.lineTo(-1, 0);
    ctx.closePath();
    ctx.fillStyle = dark;
    ctx.fill();
    // Finger tip pad
    ctx.beginPath();
    ctx.arc(2, -gripLen, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  function drawWheel(cx, cy, radius, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    // Tire
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#444';
    ctx.fill();
    // Hub
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#888';
    ctx.fill();
    // Spokes (rotate with wheel)
    ctx.rotate(angle);
    for (var s = 0; s < 3; s++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      var sa = (s / 3) * Math.PI * 2;
      ctx.lineTo(Math.cos(sa) * radius * 0.8, Math.sin(sa) * radius * 0.8);
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBase(x, y) {
    // Ground line
    var gw = getW();
    ctx.beginPath();
    ctx.moveTo(0, y + wheelRadius + 1);
    ctx.lineTo(gw, y + wheelRadius + 1);
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Wheels
    var wheelSpacing = baseWidth * 0.7;
    drawWheel(x - wheelSpacing, y + wheelRadius - 2, wheelRadius, wheelAngle);
    drawWheel(x + wheelSpacing, y + wheelRadius - 2, wheelRadius, wheelAngle);

    // Chassis (connects wheels)
    ctx.beginPath();
    var cy = y - 2;
    ctx.moveTo(x - wheelSpacing - 4, cy + 3);
    ctx.lineTo(x - wheelSpacing - 4, cy - chassisH);
    ctx.lineTo(x + wheelSpacing + 4, cy - chassisH);
    ctx.lineTo(x + wheelSpacing + 4, cy + 3);
    ctx.closePath();
    ctx.fillStyle = dark;
    ctx.fill();

    // Turret base (pedestal for arm)
    ctx.beginPath();
    ctx.moveTo(x - 14, cy - chassisH);
    ctx.lineTo(x - 10, cy - chassisH - 8);
    ctx.lineTo(x + 10, cy - chassisH - 8);
    ctx.lineTo(x + 14, cy - chassisH);
    ctx.closePath();
    ctx.fillStyle = '#3a3e42';
    ctx.fill();
  }

  // --- Mouse tracking & IK state ---
  var pageMouseX = null, pageMouseY = null;
  var hasTarget = false;
  var robotActivated = false;               // true after user clicks on the robot
  var curA1 = -Math.PI / 2, curA2 = 0;
  var smoothing = 0.08;

  function getRobotHitBox() {
    var H = getH();
    var groundY = H - wheelRadius - 4;
    var armBaseY = groundY - chassisH - 8 - 2;
    return {
      left:   robotX - baseWidth - wheelRadius,
      right:  robotX + baseWidth + wheelRadius,
      top:    armBaseY - L1 - L2 - 20,
      bottom: groundY + wheelRadius + 5
    };
  }

  document.addEventListener('mousemove', function (e) {
    pageMouseX = e.clientX;
    pageMouseY = e.clientY;
    if (robotActivated) {
      hasTarget = true;
    } else {
      // Show pointer cursor when hovering over the robot
      var rect = canvas.getBoundingClientRect();
      var cx = e.clientX - rect.left;
      var cy = e.clientY - rect.top;
      var hb = getRobotHitBox();
      canvas.style.cursor = (cx >= hb.left && cx <= hb.right && cy >= hb.top && cy <= hb.bottom)
        ? 'pointer' : 'default';
    }
  });

  document.addEventListener('mouseleave', function () {
    hasTarget = false;
  });

  canvas.addEventListener('click', function (e) {
    if (robotActivated) return;
    var rect = canvas.getBoundingClientRect();
    var cx = e.clientX - rect.left;
    var cy = e.clientY - rect.top;
    var hb = getRobotHitBox();
    if (cx >= hb.left && cx <= hb.right && cy >= hb.top && cy <= hb.bottom) {
      robotActivated = true;
      canvas.style.cursor = 'default';
      hasTarget = true;
    }
  });

  // Convert page coords to canvas CSS-pixel coords
  function pageToCanvas(px, py) {
    var rect = canvas.getBoundingClientRect();
    return { x: px - rect.left, y: py - rect.top };
  }

  function normalizeAngle(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  function solveIK(tx, ty, bx, by) {
    var x0 = bx, y0 = by;
    var a1 = curA1, a2g = curA1 + curA2;
    var angles = [a1, a2g];
    var lengths = [L1, L2];

    for (var iter = 0; iter < 12; iter++) {
      for (var i = angles.length - 1; i >= 0; i--) {
        var jx = x0, jy = y0;
        for (var j = 0; j < i; j++) {
          jx += Math.cos(angles[j]) * lengths[j];
          jy += Math.sin(angles[j]) * lengths[j];
        }
        var ex = x0, ey = y0;
        for (var j = 0; j < angles.length; j++) {
          ex += Math.cos(angles[j]) * lengths[j];
          ey += Math.sin(angles[j]) * lengths[j];
        }
        var angleToEnd = Math.atan2(ey - jy, ex - jx);
        var angleToTarget = Math.atan2(ty - jy, tx - jx);
        angles[i] += normalizeAngle(angleToTarget - angleToEnd);
      }
    }

    var ra1 = angles[0];
    var ra2 = angles[1] - angles[0];

    ra1 = Math.max(-Math.PI, Math.min(0, ra1));
    ra2 = Math.max(-2.2, Math.min(2.2, ra2));

    return { a1: ra1, a2: ra2 };
  }

  function lerpAngle(from, to, t) {
    return from + normalizeAngle(to - from) * t;
  }

  function lerp(from, to, t) {
    return from + (to - from) * t;
  }

  var lastTime = null;

  function animate(time) {
    var t = time / 1000;
    var dt = lastTime !== null ? Math.min((time - lastTime) / 1000, 0.05) : 0.016;
    lastTime = time;

    var W = getW();
    var H = getH();
    ctx.clearRect(0, 0, W, H);

    // Positions in canvas CSS coords
    var groundY = H - wheelRadius - 4;
    var baseTopY = groundY - chassisH - 8 - 2; // top of turret pedestal
    var armBaseY = baseTopY;                    // shoulder joint

    // --- Horizontal movement toward mouse ---
    var targetX = robotX; // default: stay
    var mouseCanvasX = null, mouseCanvasY = null;

    if (hasTarget && pageMouseX !== null) {
      var mc = pageToCanvas(pageMouseX, pageMouseY);
      mouseCanvasX = mc.x;
      mouseCanvasY = mc.y;
      targetX = mc.x;
    }

    // Smooth horizontal movement with acceleration / friction
    var dx = targetX - robotX;
    var maxSpeed = 200;
    var accel = 400;
    var friction = 6;

    if (hasTarget && Math.abs(dx) > 3) {
      var dir = dx > 0 ? 1 : -1;
      robotSpeed += dir * accel * dt;
      // Dampen when close
      if (Math.abs(dx) < 60) robotSpeed *= 0.95;
    } else {
      robotSpeed *= (1 - friction * dt);
    }
    robotSpeed = Math.max(-maxSpeed, Math.min(maxSpeed, robotSpeed));
    var prevX = robotX;
    robotX += robotSpeed * dt;
    // Clamp to canvas
    robotX = Math.max(baseWidth, Math.min(W - baseWidth, robotX));
    // Wheel rotation
    var distMoved = robotX - prevX;
    wheelAngle += distMoved / wheelRadius;

    // --- IK for arm ---
    var targetA1, targetA2;
    if (hasTarget && mouseCanvasX !== null) {
      var ik = solveIK(mouseCanvasX, mouseCanvasY, robotX, armBaseY);
      targetA1 = ik.a1;
      targetA2 = ik.a2;
    } else {
      targetA1 = -Math.PI / 2;
      targetA2 = 0;
    }

    curA1 = lerpAngle(curA1, targetA1, smoothing);
    curA2 = lerpAngle(curA2, targetA2, smoothing);

    // Gripper open/close
    var gripAngle = 0.35;
    if (hasTarget && mouseCanvasX !== null) {
      var x0g = robotX, y0g = armBaseY;
      var x1g = x0g + Math.cos(curA1) * L1;
      var y1g = y0g + Math.sin(curA1) * L1;
      var tA2g = curA1 + curA2;
      var x2g = x1g + Math.cos(tA2g) * L2;
      var y2g = y1g + Math.sin(tA2g) * L2;
      var dist = Math.sqrt((x2g - mouseCanvasX) * (x2g - mouseCanvasX) + (y2g - mouseCanvasY) * (y2g - mouseCanvasY));
      var closeT = Math.max(0, 1 - dist / 40);
      gripAngle = 0.35 * (1 - closeT * 0.85);
    }

    // --- Draw everything ---
    // Base + wheels
    drawBase(robotX, groundY);

    // Forward kinematics for drawing
    var x0 = robotX, y0 = armBaseY;
    var x1 = x0 + Math.cos(curA1) * L1;
    var y1 = y0 + Math.sin(curA1) * L1;
    var totalA2 = curA1 + curA2;
    var x2 = x1 + Math.cos(totalA2) * L2;
    var y2 = y1 + Math.sin(totalA2) * L2;

    // Links
    drawRoundedLink(x0, y0, curA1 - Math.PI / 2, L1, W1, accent);
    drawJoint(x0, y0, 6);
    drawRoundedLink(x1, y1, totalA2 - Math.PI / 2, L2, W2, accent);
    drawJoint(x1, y1, 5);

    // Gripper
    drawGripper(x2, y2, totalA2 - Math.PI / 2, gripAngle);
    drawJoint(x2, y2, 4);

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}