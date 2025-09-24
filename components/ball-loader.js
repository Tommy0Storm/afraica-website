/**
 * Loading Ball Component
 * Exact particle ball code with afrAIca text facing front
 */

export function initializeLoadingBall(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    throw new Error("Could not find canvas element");
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  const PARTICLE_COUNT = 15000;
  const PARTICLE_COLORS = [
    { r: 255, g: 255, b: 255 }, // White
    { r: 222, g: 49, b: 99 },   // Cherry Red (#DE3163)
    { r: 75, g: 85, b: 99 }     // Slate Gray (for background)
  ];
  const MOUSE_RADIUS = 120;
  const REPULSION_STRENGTH = 6;
  let rigidity = 1; // Perfect sphere formation
  const PARTICLE_FRICTION = 0.94;

  let particles = [];
  const mouse = { x: null, y: null };
  let animationFrameId = null;

  // Rotation variables - starting at 0,0 to face front
  let rotationX = 0, rotationY = 0;
  let targetRotationX = 0, targetRotationY = 0;
  let lastMouseX = null, lastMouseY = null;
  let isDragging = false;

  // Animation sequence variables
  let startTime = null;
  let isSpinning = true;
  let explosionStartTime = null;
  let isExploding = false;
  const SPIN_DURATION = 8; // seconds - longer spin
  const EXPLOSION_DURATION = 2; // seconds - shorter explosion, quick redirect

  const createParticles = (width, height) => {
    // Clear existing particles to prevent accumulation
    particles = [];

    const textCanvas = document.createElement('canvas');
    const textCtx = textCanvas.getContext('2d');
    if (!textCtx) return;
    const FONT_SIZE = 150;
    textCanvas.width = 1024; textCanvas.height = 256;
    textCtx.font = `bold ${FONT_SIZE}px Arial, sans-serif`;
    textCtx.textAlign = 'center'; textCtx.textBaseline = 'middle';
    const metricsAfr = textCtx.measureText('afr');
    const metricsAI = textCtx.measureText('AI');
    const totalWidth = metricsAfr.width + metricsAI.width + textCtx.measureText('ca').width;
    const startX = (textCanvas.width - totalWidth) / 2;
    textCtx.fillStyle = 'blue'; textCtx.fillText('afr', startX + metricsAfr.width / 2, 128);
    textCtx.fillStyle = 'red'; textCtx.fillText('AI', startX + metricsAfr.width + metricsAI.width / 2, 128);
    textCtx.fillStyle = 'green'; textCtx.fillText('ca', startX + metricsAfr.width + metricsAI.width + textCtx.measureText('ca').width / 2, 128);
    const imageData = textCtx.getImageData(0, 0, textCanvas.width, textCanvas.height);

    particles = [];
    const sphereRadius = 1;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    // Rotation to orient the text for mapping onto the sphere's surface
    const textMapRotY = -Math.PI / 2;
    const cosTextMapY = Math.cos(textMapRotY), sinTextMapY = Math.sin(textMapRotY);

    // Position afrAIca facing front and right-side up
    const finalRotX = Math.PI; // 180 degrees to flip upright
    const finalRotY = Math.PI; // 180 degrees to face the other way
    const cosFinalX = Math.cos(finalRotX), sinFinalX = Math.sin(finalRotX);
    const cosFinalY = Math.cos(finalRotY), sinFinalY = Math.sin(finalRotY);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = goldenAngle * i;
        const x = Math.cos(theta) * radiusAtY, z = Math.sin(theta) * radiusAtY;

        // --- 1. Determine particle color based on text mapping ---
        // Rotate the particle's coordinates temporarily to see where it lands on the text map
        const textMapX = x * cosTextMapY - z * sinTextMapY;
        const textMapZ = x * sinTextMapY + z * cosTextMapY;
        const textMapY = y;

        const particleLongitude = Math.atan2(textMapZ, textMapX);
        const particleLatitude = Math.acos(textMapY);
        let isTextParticle = false, particleColor;
        const textBandHeight = 0.4;
        const textBandStartLat = Math.PI * (1 - textBandHeight) / 2;
        const textBandEndLat = Math.PI * (1 + textBandHeight) / 2;

        if (particleLatitude > textBandStartLat && particleLatitude < textBandEndLat) {
          const u = (particleLongitude + Math.PI) / (2 * Math.PI);
          const v = (particleLatitude - textBandStartLat) / (textBandEndLat - textBandStartLat);
          const textX = Math.floor(u * textCanvas.width), textY = Math.floor(v * textCanvas.height);
          const pixelIndex = (textY * textCanvas.width + textX) * 4;
          if (imageData.data[pixelIndex + 3] > 128) {
            isTextParticle = true;
            particleColor = imageData.data[pixelIndex] > 128 ? PARTICLE_COLORS[1] : PARTICLE_COLORS[0];
          }
        }
        if (!isTextParticle) {
            particleColor = Math.random() < 0.15 ? PARTICLE_COLORS[1] : PARTICLE_COLORS[2];
        }

        // --- 2. Calculate the FINAL base coordinates with front-facing rotation ---
        // Apply final Y rotation to the original coordinates
        const x1 = x * cosFinalY - z * sinFinalY;
        const z1 = x * sinFinalY + z * cosFinalY;
        // Then apply final X rotation
        const y2 = y * cosFinalX - z1 * sinFinalX;
        const z2 = y * sinFinalX + z1 * cosFinalX;
        const x2 = x1;

        const baseX3d = x2 * sphereRadius;
        const baseY3d = y2 * sphereRadius;
        const baseZ3d = z2 * sphereRadius;

        const scale = Math.min(width, height) * 0.225; // 25% smaller
        const ballCenterY = height / 2 + 38; // Move ball down by ~1cm (38px)
        particles.push({
            x: (baseX3d * scale) + width / 2, y: (baseY3d * scale) + ballCenterY,
            baseX: (baseX3d * scale) + width / 2, baseY: (baseY3d * scale) + ballCenterY,
            baseX3d, baseY3d, baseZ3d,
            vx: 0, vy: 0, z: baseZ3d, radius: 1, color: particleColor, density: Math.random() * 20 + 10,
        });
    }
  };

  const animate = () => {
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const canvasWidth = canvas.width / dpr, canvasHeight = canvas.height / dpr;

    // Initialize start time
    if (!startTime) startTime = performance.now();
    const elapsed = (performance.now() - startTime) / 1000; // seconds

    // Handle spinning phase
    if (elapsed < SPIN_DURATION && isSpinning) {
      targetRotationY += 0.05; // Automatic spinning
    } else if (isSpinning) {
      // Stop spinning
      isSpinning = false;
      explosionStartTime = performance.now();
      isExploding = true;
    }

    // Handle explosion phase
    if (isExploding && explosionStartTime) {
      const explosionElapsed = (performance.now() - explosionStartTime) / 1000;
      console.log('Explosion progress:', explosionElapsed, '/', EXPLOSION_DURATION);

      if (explosionElapsed >= EXPLOSION_DURATION) {
        // Stop animation completely
        cancelAnimationFrame(animationFrameId);

        // Mark loading as complete and redirect immediately
        sessionStorage.setItem('afraica-loaded', 'true');
        console.log('Animation complete! Redirecting to main.html...');

        // Multiple redirect methods for reliability
        window.location.href = './main.html';
        setTimeout(() => {
          window.location.replace('./main.html');
        }, 50);
        setTimeout(() => {
          window.location = './main.html';
        }, 100);

        return; // Exit animation loop
      }
    }

    rotationY += (targetRotationY - rotationY) * 0.05;
    rotationX += (targetRotationX - rotationX) * 0.05;
    if (!isDragging && !isSpinning) {
        targetRotationY *= 0.95;
        targetRotationX *= 0.95;
    }

    const scale = Math.min(canvasWidth, canvasHeight) * 0.225; // 25% smaller
    const centerX = canvasWidth / 2, centerY = canvasHeight / 2 + 38; // Move ball down by ~1cm (38px)
    const cosX = Math.cos(rotationX), sinX = Math.sin(rotationX);
    const cosY = Math.cos(rotationY), sinY = Math.sin(rotationY);
    particles.sort((a, b) => a.z - b.z);

    particles.forEach(p => {
        let x1 = p.baseX3d * cosY - p.baseZ3d * sinY, z1 = p.baseX3d * sinY + p.baseZ3d * cosY;
        let y2 = p.baseY3d * cosX - z1 * sinX, z2 = p.baseY3d * sinX + z1 * cosX;
        p.z = z2; p.baseX = x1 * scale + centerX; p.baseY = y2 * scale + centerY;

        if (!isExploding && rigidity >= 1.0) {
            p.x = p.baseX; p.y = p.baseY; p.vx = 0; p.vy = 0;
        } else {
            // Handle explosion effect
            if (isExploding) {
                const centerX = canvasWidth / 2;
                const centerY = canvasHeight / 2 + 38;
                const dx = p.x - centerX;
                const dy = p.y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > 0) {
                    const explosionForce = 15; // Strong outward force
                    p.vx += (dx / distance) * explosionForce;
                    p.vy += (dy / distance) * explosionForce;
                }
            }

            let dx = (mouse.x ?? -9999) - p.x, dy = (mouse.y ?? -9999) - p.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < MOUSE_RADIUS && !isExploding) {
                const force = (MOUSE_RADIUS - distance) / MOUSE_RADIUS;
                p.vx -= (dx / distance) * force * REPULSION_STRENGTH * p.density;
                p.vy -= (dy / distance) * force * REPULSION_STRENGTH * p.density;
            } else if (rigidity > 0 && !isExploding) {
                p.vx += (p.baseX - p.x) * (rigidity * 0.4);
                p.vy += (p.baseY - p.y) * (rigidity * 0.4);
            }
            if (rigidity > 0) { p.vx *= PARTICLE_FRICTION; p.vy *= PARTICLE_FRICTION; }
            p.x += p.vx; p.y += p.vy;
        }

        const opacity = 0.4 + ((p.z + 1) / 2) * 0.6;
        p.radius = ((p.z + 1.5) / 2.5) * 2 + 0.5;
        if (p.color.r > 100 || p.color.g > 100) {
          ctx.shadowBlur = 15; ctx.shadowColor = `rgb(${p.color.r}, ${p.color.g}, ${p.color.b})`;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${opacity})`;
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    animationFrameId = requestAnimationFrame(animate);
  };

  const handleMouseDown = (event) => {
    isDragging = true;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  };
  const handleMouseUp = () => { isDragging = false; };
  const handleMouseMove = (event) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const scaleX = canvas.width / dpr / rect.width, scaleY = canvas.height / dpr / rect.height;
    mouse.x = (event.clientX - rect.left) * scaleX;
    mouse.y = (event.clientY - rect.top) * scaleY;

    if (isDragging) {
        targetRotationY += (event.clientX - lastMouseX) * 0.01;
        targetRotationX -= (event.clientY - lastMouseY) * 0.01;
    }
    lastMouseX = event.clientX; lastMouseY = event.clientY;
  };
  const handleMouseLeave = () => {
      mouse.x = null; mouse.y = null; isDragging = false;
  };
  const handleResize = () => {
      cancelAnimationFrame(animationFrameId);
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      const canvasWidth = canvas.width / dpr, canvasHeight = canvas.height / dpr;
      createParticles(canvasWidth, canvasHeight);
      animate();
  };

  // Initialize
  window.addEventListener('resize', handleResize);
  window.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  window.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  handleResize();

  // Return cleanup function
  return () => {
    cancelAnimationFrame(animationFrameId);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mouseleave', handleMouseLeave);
  };
}