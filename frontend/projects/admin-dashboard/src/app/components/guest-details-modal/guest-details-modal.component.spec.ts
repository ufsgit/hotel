import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuestDetailsModalComponent } from './guest-details-modal.component';

describe('GuestDetailsModalComponent', () => {
  let component: GuestDetailsModalComponent;
  let fixture: ComponentFixture<GuestDetailsModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuestDetailsModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GuestDetailsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
