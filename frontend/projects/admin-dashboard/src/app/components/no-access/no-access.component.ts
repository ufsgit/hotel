import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-no-access',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full flex flex-col items-center justify-center animate-fade-in p-6 text-center">
      <div class="w-24 h-24 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-rose-200">
        <i class="material-icons text-5xl">lock</i>
      </div>
      <h1 class="text-3xl font-black text-indigo-950 mb-3 tracking-tight">Access Denied</h1>
      <p class="text-slate-500 max-w-md text-lg leading-relaxed">
        You do not have permission to view any pages on this property. Please contact the property owner to request access.
      </p>
    </div>
  `
})
export class NoAccessComponent {}
