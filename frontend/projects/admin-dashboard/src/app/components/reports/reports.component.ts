import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { AdminApiService } from '../../services/admin-api.service';
import { ChartConfiguration, ChartType } from 'chart.js';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, NgChartsModule],
  templateUrl: './reports.component.html'
})
export class ReportsComponent implements OnInit {
  isLoading = true;
  selectedRange = '30d';
  
  stats: any = null;

  // Chart configs
  revenueChartData: ChartConfiguration['data'] = { datasets: [] };
  revenueChartOptions: ChartConfiguration['options'] = { 
    responsive: true, 
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    animation: { duration: 2500, easing: 'easeOutElastic' },
    animations: {
      y: { easing: 'easeOutElastic', duration: 2500,
           from: (ctx: any) => ctx.chart?.scales?.y?.getPixelForValue(0) || 0 }
    }
  };
  revenueChartType: ChartType = 'line';

  occupancyChartData: ChartConfiguration['data'] = { datasets: [] };
  occupancyChartOptions: ChartConfiguration['options'] = { 
    responsive: true, 
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, max: 100 } },
    animation: {
      duration: 2000,
      easing: 'easeOutElastic',
      delay: (context: any) => context.dataIndex * 150
    }
  };
  occupancyChartType: ChartType = 'bar';

  expenseChartData: ChartConfiguration['data'] = { datasets: [] };
  expenseChartOptions: ChartConfiguration['options'] = { 
    responsive: true, 
    maintainAspectRatio: false,
    animation: {
      duration: 1500,
      easing: 'easeOutBounce',
      delay: 400
    }
  };
  expenseChartType: ChartType = 'pie';

  profChartData: ChartConfiguration['data'] = { datasets: [] };
  profChartOptions: ChartConfiguration['options'] = { 
    responsive: true, 
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
    animation: {
      duration: 2000,
      easing: 'easeOutElastic',
      delay: (context: any) => context.dataIndex * 150
    }
  };
  profChartType: ChartType = 'bar';

  constructor(private api: AdminApiService) {}

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.isLoading = true;
    this.api.getStats(this.selectedRange).subscribe({
      next: (data) => {
        this.stats = data;
        this.setupCharts(data);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  setupCharts(data: any) {
    // Revenue Line Chart
    this.revenueChartData = {
      labels: data.revenueTrend?.labels || [],
      datasets: [
        {
          data: data.revenueTrend?.values || [],
          label: 'Total Revenue (₹)',
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };

    // Occupancy Bar Chart
    this.occupancyChartData = {
      labels: data.occupancyByRoomType?.labels || [],
      datasets: [
        {
          data: data.occupancyByRoomType?.values || [],
          label: 'Occupancy Rate (%)',
          backgroundColor: '#10b981',
          borderRadius: 4
        }
      ]
    };

    // Room Profitability Bar Chart
    this.profChartData = {
      labels: data.roomTypeProfitability?.labels || [],
      datasets: [
        {
          data: data.roomTypeProfitability?.values || [],
          label: 'Revenue (₹)',
          backgroundColor: '#3b82f6',
          borderRadius: 4
        }
      ]
    };

    // Expense Pie Chart
    this.expenseChartData = {
      labels: data.expenseDistribution?.labels?.length ? data.expenseDistribution.labels : ['No Data'],
      datasets: [
        {
          data: data.expenseDistribution?.values?.length ? data.expenseDistribution.values : [1],
          backgroundColor: data.expenseDistribution?.values?.length 
            ? ['#f43f5e', '#8b5cf6', '#0ea5e9', '#f59e0b', '#10b981', '#64748b']
            : ['#e2e8f0']
        }
      ]
    };
  }
}
