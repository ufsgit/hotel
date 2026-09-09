import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../services/admin-api.service';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { trigger, style, animate, transition, query, stagger } from '@angular/animations';
import { CountUpDirective } from '../../directives/count-up.directive';

const STORAGE_KEY_LINE = 'dashboard_line_chart';
const STORAGE_KEY_BAR  = 'dashboard_bar_chart';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule, CountUpDirective],
  templateUrl: './dashboard.component.html',
  animations: [
    trigger('staggerList', [
      transition(':enter', [
        query('.stagger-item', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('100ms', [
            animate('500ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class DashboardComponent implements OnInit {
  stats: any = { revenue: 0, expectedRevenue: 0, totalBookings: 0, arrivalsToday: 0, departuresToday: 0 };
  isLoading = true;

  // ── Edit panel toggles ──────────────────────────────────────────────────────
  showLineEditor = false;
  showBarEditor  = false;

  // ── Editable data (bound to inputs) ────────────────────────────────────────
  lineLabels: string[] = [];
  lineValues: number[] = [];
  barLabels:  string[] = [];
  barValues:  number[] = [];

  // ── Chart.js data ───────────────────────────────────────────────────────────
  public lineChartData!: ChartConfiguration<'line'>['data'];
  public barChartData!:  ChartConfiguration<'bar'>['data'];

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 2500, easing: 'easeOutElastic' },
    animations: {
      y: { easing: 'easeOutElastic', duration: 2500,
           from: (ctx: any) => ctx.chart?.scales?.y?.getPixelForValue(0) || 0 }
    },
    plugins: { legend: { display: false } },
    scales: {
      y: { border: { display: false }, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { border: { display: false }, grid: { display: false } }
    }
  };

  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 2000,
      easing: 'easeOutElastic',
      delay: (context) => context.dataIndex * 150
    },
    plugins: { legend: { display: false } },
    scales: {
      y: { border: { display: false }, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { border: { display: false }, grid: { display: false } }
    }
  };

  constructor(private api: AdminApiService) {}

  ngOnInit(): void {
    this.loadChartData();
    this.api.getStats().subscribe({
      next: (data) => { this.stats = data; this.isLoading = false; },
      error: (err) => { console.error('Failed to load stats', err); this.isLoading = false; }
    });
  }

  // ── Persistence helpers ─────────────────────────────────────────────────────
  private loadChartData(): void {
    const savedLine = localStorage.getItem(STORAGE_KEY_LINE);
    const savedBar  = localStorage.getItem(STORAGE_KEY_BAR);

    if (savedLine) {
      const d = JSON.parse(savedLine);
      this.lineLabels = d.labels;
      this.lineValues = d.values;
    } else {
      this.lineLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      this.lineValues = [1200, 1900, 1500, 2200, 1800, 2500, 2800];
    }

    if (savedBar) {
      const d = JSON.parse(savedBar);
      this.barLabels = d.labels;
      this.barValues = d.values;
    } else {
      this.barLabels = ['Standard', 'Deluxe', 'Suite', 'Penthouse'];
      this.barValues = [65, 45, 20, 5];
    }

    this.rebuildLineChart();
    this.rebuildBarChart();
  }

  private rebuildLineChart(): void {
    this.lineChartData = {
      labels: [...this.lineLabels],
      datasets: [{
        data: [...this.lineValues],
        label: 'Revenue ($)',
        fill: true,
        tension: 0.4,
        borderColor: '#008cff',
        backgroundColor: 'rgba(0, 140, 255, 0.15)',
        pointBackgroundColor: '#005499',
        pointBorderColor: '#ffffff',
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: '#008cff'
      }]
    };
  }

  private rebuildBarChart(): void {
    this.barChartData = {
      labels: [...this.barLabels],
      datasets: [{
        data: [...this.barValues],
        label: 'Occupancy %',
        backgroundColor: '#eb6125',
        hoverBackgroundColor: '#bc4e1e',
        borderRadius: 6
      }]
    };
  }

  // ── Editor actions ──────────────────────────────────────────────────────────
  toggleLineEditor(): void {
    this.showLineEditor = !this.showLineEditor;
    if (this.showLineEditor) this.showBarEditor = false;
  }

  toggleBarEditor(): void {
    this.showBarEditor = !this.showBarEditor;
    if (this.showBarEditor) this.showLineEditor = false;
  }

  addLinePoint(): void {
    this.lineLabels = [...this.lineLabels, 'New'];
    this.lineValues = [...this.lineValues, 0];
  }

  removeLinePoint(i: number): void {
    this.lineLabels = this.lineLabels.filter((_, idx) => idx !== i);
    this.lineValues = this.lineValues.filter((_, idx) => idx !== i);
  }

  addBarPoint(): void {
    this.barLabels = [...this.barLabels, 'New'];
    this.barValues = [...this.barValues, 0];
  }

  removeBarPoint(i: number): void {
    this.barLabels = this.barLabels.filter((_, idx) => idx !== i);
    this.barValues = this.barValues.filter((_, idx) => idx !== i);
  }

  applyLineChart(): void {
    localStorage.setItem(STORAGE_KEY_LINE, JSON.stringify({ labels: this.lineLabels, values: this.lineValues }));
    this.rebuildLineChart();
    this.showLineEditor = false;
  }

  applyBarChart(): void {
    localStorage.setItem(STORAGE_KEY_BAR, JSON.stringify({ labels: this.barLabels, values: this.barValues }));
    this.rebuildBarChart();
    this.showBarEditor = false;
  }

  resetLineChart(): void {
    localStorage.removeItem(STORAGE_KEY_LINE);
    this.lineLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    this.lineValues = [1200, 1900, 1500, 2200, 1800, 2500, 2800];
    this.rebuildLineChart();
    this.showLineEditor = false;
  }

  resetBarChart(): void {
    localStorage.removeItem(STORAGE_KEY_BAR);
    this.barLabels = ['Standard', 'Deluxe', 'Suite', 'Penthouse'];
    this.barValues = [65, 45, 20, 5];
    this.rebuildBarChart();
    this.showBarEditor = false;
  }

  trackByIndex(index: number): number { return index; }
}
