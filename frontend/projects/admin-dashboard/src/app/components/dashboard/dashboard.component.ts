import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class DashboardComponent implements OnInit, OnDestroy {
  stats: any = { revenue: 0, expectedRevenue: 0, totalBookings: 0, arrivalsToday: 0, departuresToday: 0 };
  isLoading = true;
  private statsInterval: any;
  selectedRange: 'today' | '7d' | '30d' | 'all' = '7d';

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

  // ── Live backend data cache ────────────────────────────────────────────────
  liveRevenueTrend: { labels: string[], values: number[] } = { labels: [], values: [] };
  liveOccupancy: { labels: string[], values: number[] } = { labels: [], values: [] };

  // ── Stat Details Modal ──────────────────────────────────────────────────────
  isStatModalOpen = false;
  statModalTitle = '';
  statModalBookings: any[] = [];
  isStatLoading = false;

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 2500, easing: 'easeOutElastic' },
    animations: {
      y: { easing: 'easeOutElastic', duration: 2500,
           from: (ctx: any) => ctx.chart?.scales?.y?.getPixelForValue(0) || 0 }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Revenue: ₹${Number(context.parsed.y).toLocaleString()}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          callback: (val) => `₹${val}`
        }
      },
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
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => ` Occupancy: ${context.parsed.y}%`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        border: { display: false },
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: {
          stepSize: 20,
          callback: (val) => `${val}%`
        }
      },
      x: { border: { display: false }, grid: { display: false } }
    }
  };

  constructor(private api: AdminApiService) {}

  ngOnInit(): void {
    this.loadStats();
    // Poll stats every 10 seconds to keep numbers live
    this.statsInterval = setInterval(() => this.refreshStats(), 10000);
  }

  loadStats(): void {
    this.isLoading = true;
    
    // Clear any previous mock data saved in localStorage so live data takes precedence
    this.cleanLegacyMockStorage();

    this.api.getStats(this.selectedRange).subscribe({
      next: (data) => {
        this.stats = data;

        if (data.revenueTrend && data.revenueTrend.labels?.length) {
          this.liveRevenueTrend = data.revenueTrend;
          const savedLine = localStorage.getItem(STORAGE_KEY_LINE + '_' + this.selectedRange);
          if (savedLine) {
            const parsed = JSON.parse(savedLine);
            this.lineLabels = parsed.labels;
            this.lineValues = parsed.values;
          } else {
            this.lineLabels = [...data.revenueTrend.labels];
            this.lineValues = [...data.revenueTrend.values];
          }
          this.rebuildLineChart();
        } else {
          this.lineLabels = ['No Data'];
          this.lineValues = [0];
          this.rebuildLineChart();
        }

        if (data.occupancyByRoomType && data.occupancyByRoomType.labels?.length) {
          this.liveOccupancy = data.occupancyByRoomType;
          const savedBar = localStorage.getItem(STORAGE_KEY_BAR);
          if (savedBar) {
            const parsed = JSON.parse(savedBar);
            this.barLabels = parsed.labels;
            this.barValues = parsed.values;
          } else {
            this.barLabels = [...data.occupancyByRoomType.labels];
            this.barValues = [...data.occupancyByRoomType.values];
          }
          this.rebuildBarChart();
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load stats', err);
        this.loadChartFallback();
        this.isLoading = false;
      }
    });
  }

  onRangeChange(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    if (this.statsInterval) clearInterval(this.statsInterval);
  }

  /** Lightweight refresh — only updates stat numbers, leaves charts untouched */
  refreshStats(): void {
    this.api.getStats(this.selectedRange).subscribe({
      next: (data) => {
        this.stats = {
          ...this.stats,
          revenue: data.revenue,
          expectedRevenue: data.expectedRevenue,
          totalBookings: data.totalBookings,
          arrivalsToday: data.arrivalsToday,
          departuresToday: data.departuresToday
        };
      },
      error: () => {} // silently ignore polling errors
    });
  }

  private cleanLegacyMockStorage(): void {
    const savedLine = localStorage.getItem(STORAGE_KEY_LINE);
    if (savedLine && savedLine.includes('1200')) {
      localStorage.removeItem(STORAGE_KEY_LINE);
    }
    const savedBar = localStorage.getItem(STORAGE_KEY_BAR);
    if (savedBar && savedBar.includes('Penthouse')) {
      localStorage.removeItem(STORAGE_KEY_BAR);
    }
  }

  private loadChartFallback(): void {
    this.lineLabels = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
    this.lineValues = [0, 0, 0, 0, 0, 0, 0];
    this.barLabels = ['Standard Room', 'Deluxe Suite'];
    this.barValues = [0, 0];
    this.rebuildLineChart();
    this.rebuildBarChart();
  }

  private rebuildLineChart(): void {
    this.lineChartData = {
      labels: [...this.lineLabels],
      datasets: [{
        data: [...this.lineValues],
        label: 'Revenue (₹)',
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
    localStorage.setItem(STORAGE_KEY_LINE + '_' + this.selectedRange, JSON.stringify({ labels: this.lineLabels, values: this.lineValues }));
    this.rebuildLineChart();
    this.showLineEditor = false;
  }

  applyBarChart(): void {
    localStorage.setItem(STORAGE_KEY_BAR, JSON.stringify({ labels: this.barLabels, values: this.barValues }));
    this.rebuildBarChart();
    this.showBarEditor = false;
  }

  resetLineChart(): void {
    localStorage.removeItem(STORAGE_KEY_LINE + '_' + this.selectedRange);
    if (this.liveRevenueTrend.labels.length) {
      this.lineLabels = [...this.liveRevenueTrend.labels];
      this.lineValues = [...this.liveRevenueTrend.values];
    } else {
      this.lineLabels = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
      this.lineValues = [0, 0, 0, 0, 0, 0, 0];
    }
    this.rebuildLineChart();
    this.showLineEditor = false;
  }

  resetBarChart(): void {
    localStorage.removeItem(STORAGE_KEY_BAR);
    if (this.liveOccupancy.labels.length) {
      this.barLabels = [...this.liveOccupancy.labels];
      this.barValues = [...this.liveOccupancy.values];
    } else {
      this.barLabels = ['Standard Room', 'Deluxe Suite'];
      this.barValues = [0, 0];
    }
    this.rebuildBarChart();
    this.showBarEditor = false;
  }

  // ── Stat Details Modal ──────────────────────────────────────────────────────
  openStatDetails(metric: string): void {
    if (metric === 'revenue') this.statModalTitle = 'Collected Revenue Guests';
    else if (metric === 'bookings') this.statModalTitle = 'Recent Bookings';
    else if (metric === 'arrivals') this.statModalTitle = 'Guests Checked In Today';
    else if (metric === 'departures') this.statModalTitle = 'Guests Checking Out Today';
    else return;

    this.isStatModalOpen = true;
    this.isStatLoading = true;
    this.statModalBookings = [];

    this.api.getStatDetails(metric, this.selectedRange).subscribe({
      next: (data) => {
        this.statModalBookings = data;
        this.isStatLoading = false;
      },
      error: (err) => {
        console.error('Failed to load stat details', err);
        this.isStatLoading = false;
      }
    });
  }

  closeStatModal(): void {
    this.isStatModalOpen = false;
    this.statModalBookings = [];
  }

  trackByIndex(index: number): number { return index; }
}
