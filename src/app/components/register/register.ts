import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent implements AfterViewInit, OnDestroy {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  isLoading = false;
  errorMsg = '';
  private floatStage: HTMLElement | null = null;
  private styleEl: HTMLElement | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.injectKeyframes();
      this.initFloatingText();
      this.initParticles();
    }, 50);
  }

  ngOnDestroy(): void {
    this.floatStage?.remove();
    this.styleEl?.remove();
  }

  onRegister() {
    this.errorMsg = '';
    if (this.password !== this.confirmPassword) {
      this.errorMsg = 'Passwords do not match.';
      return;
    }
    this.isLoading = true;
    this.http.post('http://localhost:8080/api/v1/auth/register', {
      fullName: this.fullName,
      email: this.email,
      password: this.password
    }).subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => {
        this.isLoading = false;
        this.errorMsg = 'Registration failed. Email may already exist.';
      }
    });
  }

  private injectKeyframes(): void {
    this.styleEl = document.createElement('style');
    this.styleEl.textContent = `
      @keyframes floatUp {
        0%   { transform: translateY(110vh); opacity: 0; }
        8%   { opacity: 1; }
        92%  { opacity: 1; }
        100% { transform: translateY(-20vh); opacity: 0; }
      }
    `;
    document.head.appendChild(this.styleEl);
  }

  private initFloatingText(): void {
    const items = [
      { text: 'Audemars Piguet',     size: 1.6, dur: 20, delay: 0,  left: 4  },
      { text: 'Bugatti',             size: 2.2, dur: 24, delay: 3,  left: 18 },
      { text: 'Hermès',              size: 1.4, dur: 18, delay: 7,  left: 35 },
      { text: 'Vacheron Constantin', size: 1.9, dur: 22, delay: 1,  left: 52 },
      { text: 'Rolls-Royce',         size: 1.5, dur: 26, delay: 9,  left: 68 },
      { text: 'Loro Piana',          size: 2.0, dur: 19, delay: 4,  left: 80 },
      { text: 'Koenigsegg',          size: 1.3, dur: 21, delay: 11, left: 11 },
      { text: 'Richard Mille',       size: 2.4, dur: 17, delay: 2,  left: 44 },
      { text: 'A. Lange & Söhne',    size: 1.2, dur: 23, delay: 8,  left: 63 },
      { text: 'Goyard',              size: 1.6, dur: 16, delay: 5,  left: 86 },
      { text: 'Pagani',              size: 2.8, dur: 28, delay: 10, left: 28 },
      { text: 'Graff',               size: 1.1, dur: 20, delay: 13, left: 73 },
      { text: 'F.P. Journe',         size: 1.5, dur: 25, delay: 6,  left: 56 },
    ];

    const stage = document.createElement('div');
    stage.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;overflow:hidden;`;
    document.body.appendChild(stage);
    this.floatStage = stage;

    items.forEach(item => {
      const el = document.createElement('span');
      const opacity = (0.06 + Math.random() * 0.06).toFixed(3);
      el.style.cssText = `
        position: absolute;
        top: 0;
        left: ${item.left}%;
        font-family: 'Playfair Display', serif;
        font-style: italic;
        color: #b8942a;
        white-space: nowrap;
        font-size: ${item.size}rem;
        opacity: ${opacity};
        animation: floatUp ${item.dur}s linear ${item.delay}s infinite;
        transform: translateY(110vh);
      `;
      el.textContent = item.text;
      stage.appendChild(el);
    });
  }

  private initParticles(): void {
    const canvas = document.getElementById('register-particle-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.35 + 0.05,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(184,148,42,${p.alpha})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(184,148,42,${0.04 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    };
    animate();
  }
}