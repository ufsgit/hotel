import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminApiService } from '../../services/admin-api.service';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartOptions, ChartType } from 'chart.js';
import { trigger, style, animate, transition, query, stagger } from '@angular/animations';
import { CountUpDirective } from '../../directives/count-up.directive';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgChartsModule, CountUpDirective],
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
    ])
  ]
})
export class DashboardComponent implements OnInit {
  stats: any = {
    revenue: 0,
    totalBookings: 0,
    arrivalsToday: 0,
    departuresToday: 0
  };
  isLoading = true;

  // Chart properties
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [1200, 1900, 1500, 2200, 1800, 2500, 2800],
        label: 'Revenue ($)',
        fill: true,
        tension: 0.4,
        borderColor: '#3730a3',
        backgroundColor: 'rgba(55, 48, 163, 0.1)',
        pointBackgroundColor: '#4f46e5'
      }
    ]
  };
  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animations: {
      x: { type: 'number', easing: 'easeOutQuart', duration: 800, from: NaN }
    },
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: { border: { display: false }, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { border: { display: false }, grid: { display: false } }
    }
  };

  public barChartData: ChartConfiguration<'bar'>['data'] = {
    labels: ['Standard', 'Deluxe', 'Suite', 'Penthouse'],
    datasets: [
      {
        data: [65, 45, 20, 5],
        label: 'Occupancy %',
        backgroundColor: '#4f46e5',
        borderRadius: 4
      }
    ]
  };
  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 500,
      easing: 'easeOutQuart',
      delay: (context) => context.dataIndex * 50 // Staggered grow-from-baseline
    },
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: { border: { display: false }, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { border: { display: false }, grid: { display: false } }
    }
  };

  constructor(private api: AdminApiService) {}

  ngOnInit(): void {
    this.api.getStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load stats', err);
        this.isLoading = false;
      }
    });
  }
}
