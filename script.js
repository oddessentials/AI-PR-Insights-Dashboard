// Minimal chart + small load/hover interactions

// Trend data (days). Tuned to resemble the mock.
const values = [2.25, 2.20, 2.15, 2.05, 2.20, 2.12, 2.10, 2.08, 2.40];

const svg  = document.getElementById('trend');
const line = document.getElementById('trend-line');
const area = document.getElementById('trend-area');

function mapPoints(vals){
  const x0 = 50, y0 = 200, x1 = 580, y1 = 40; // chart bounds
  const w = x1 - x0;
  const h = y0 - y1;

  const minY = 1.0;
  const maxY = 3.0;

  const stepX = w / (vals.length - 1);
  const pts = vals.map((v,i)=>{
    const x = x0 + stepX * i;
    const y = y0 - ((v - minY) / (maxY - minY)) * h;
    return [x,y];
  });

  return {pts, x0, y0};
}

function drawTrend() {
  const {pts, x0, y0} = mapPoints(values);
  const poly = pts.map(p=>p.join(',')).join(' ');
  line.setAttribute('points', poly);

  const areaPts = [[x0, y0], ...pts, [pts[pts.length-1][0], y0]];
  area.setAttribute('points', areaPts.map(p=>p.join(',')).join(' '));

  // Animate the line drawing
  const length = line.getTotalLength?.() ?? 800;
  line.style.strokeDasharray = length;
  line.style.strokeDashoffset = length;
  line.getBoundingClientRect(); // force reflow
  line.style.transition = 'stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)';
  line.style.strokeDashoffset = '0';
}

// Animate progress bars on load using CSS variable --w
function animateBars() {
  document.querySelectorAll('.bar-fill').forEach(el=>{
    const target = getComputedStyle(el).getPropertyValue('--w').trim() || '0%';
    requestAnimationFrame(()=>{ el.style.width = target; });
  });
}

drawTrend();
animateBars();

// Hover interaction: emphasize the area fill when the chart card is hovered
const chartCard = document.querySelector('.chart-card');
chartCard.addEventListener('mouseenter', ()=> area.style.opacity = '1');
chartCard.addEventListener('mouseleave', ()=> area.style.opacity = '0.7');
