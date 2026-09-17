import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService } from '../../services/admin-api.service';
import { GuestDetailsModalComponent } from '../guest-details-modal/guest-details-modal.component';

@Component({
  selector: 'app-active-guests',
  standalone: true,
  imports: [CommonModule, FormsModule, GuestDetailsModalComponent],
  templateUrl: './active-guests.component.html'
})
export class ActiveGuestsComponent implements OnInit {
  activeGuests: any[] = [];
  isLoading = true;

  // Expenses Modal State
  selectedGuest: any = null;
  isExpensesModalOpen = false;
  expenses: any[] = [];
  isExpensesLoading = false;

  // Guest Details Modal State
  detailsGuest: any = null;
  isGuestDetailsModalOpen = false;

  // New Expense Form State
  newExpense = {
    expense_type: 'food',
    amount: null,
    description: ''
  };
  customExpenseType = '';
  isAddingExpense = false;

  editingExpenseId: number | null = null;
  partialAmount: number | null = null;

  constructor(private api: AdminApiService) {}

  ngOnInit(): void {
    this.loadActiveGuests();
  }

  loadActiveGuests(): void {
    this.isLoading = true;
    // status='checked_in', large limit to fetch all active guests
    this.api.getBookings(1, 100, '', 'checked_in').subscribe({
      next: (res) => {
        this.activeGuests = (res.data || []).map((guest: any) => ({
          ...guest,
          total_expenses: parseFloat(guest.total_expenses || 0),
          unpaid_expenses: parseFloat(guest.unpaid_expenses || 0)
        }));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load active guests', err);
        this.isLoading = false;
      }
    });
  }

  openGuestDetailsModal(guest: any): void {
    this.detailsGuest = guest;
    this.isGuestDetailsModalOpen = true;
  }

  closeGuestDetailsModal(): void {
    this.isGuestDetailsModalOpen = false;
    this.detailsGuest = null;
  }

  openExpensesModal(guest: any): void {
    this.selectedGuest = guest;
    this.isExpensesModalOpen = true;
    this.loadExpenses(guest.id);
  }

  closeExpensesModal(): void {
    this.isExpensesModalOpen = false;
    this.selectedGuest = null;
    this.expenses = [];
    this.newExpense = { expense_type: 'food', amount: null, description: '' };
    this.customExpenseType = '';
    this.editingExpenseId = null;
    this.partialAmount = null;
  }

  loadExpenses(bookingId: number): void {
    this.isExpensesLoading = true;
    this.api.getBookingExpenses(bookingId).subscribe({
      next: (data) => {
        this.expenses = data;
        this.isExpensesLoading = false;
      },
      error: (err) => {
        console.error('Failed to load expenses', err);
        this.isExpensesLoading = false;
      }
    });
  }

  addExpense(): void {
    if (!this.newExpense.amount || this.newExpense.amount <= 0) return;
    
    const payload = { ...this.newExpense };
    if (payload.expense_type === 'custom') {
      if (!this.customExpenseType.trim()) return;
      payload.expense_type = this.customExpenseType.trim();
    }

    this.isAddingExpense = true;
    this.api.addBookingExpense(this.selectedGuest.id, payload).subscribe({
      next: () => {
        this.isAddingExpense = false;
        this.newExpense = { expense_type: 'food', amount: null, description: '' };
        this.customExpenseType = '';
        this.loadExpenses(this.selectedGuest.id);
        this.loadActiveGuests();
      },
      error: (err) => {
        console.error('Failed to add expense', err);
        this.isAddingExpense = false;
      }
    });
  }

  onExpenseStatusChange(expense: any, newStatus: string): void {
    if (newStatus === 'partial') {
      expense.payment_status = 'partial';
      this.editingExpenseId = expense.id;
      this.partialAmount = parseFloat(expense.amount_paid) || null;
    } else {
      this.editingExpenseId = null;
      this.updateExpenseStatus(expense.id, newStatus);
    }
  }

  savePartialPayment(expense: any): void {
    if (this.partialAmount === null || this.partialAmount <= 0) return;
    this.api.updateBookingExpenseStatus(this.selectedGuest.id, expense.id, 'partial', this.partialAmount).subscribe({
      next: () => {
        this.editingExpenseId = null;
        this.partialAmount = null;
        this.loadExpenses(this.selectedGuest.id);
        this.loadActiveGuests();
      },
      error: (err) => {
        console.error('Failed to save partial payment', err);
      }
    });
  }

  updateExpenseStatus(expenseId: number, status: string): void {
    this.api.updateBookingExpenseStatus(this.selectedGuest.id, expenseId, status).subscribe({
      next: () => {
        this.loadExpenses(this.selectedGuest.id);
        this.loadActiveGuests();
      },
      error: (err) => {
        console.error('Failed to update expense status', err);
      }
    });
  }

  getTotalUnpaidExpenses(): number {
    return this.expenses
      .filter(e => e.payment_status !== 'paid')
      .reduce((sum, e) => {
        if (e.payment_status === 'partial') return sum + (parseFloat(e.amount) - (parseFloat(e.amount_paid) || 0));
        return sum + parseFloat(e.amount);
      }, 0);
  }
}
