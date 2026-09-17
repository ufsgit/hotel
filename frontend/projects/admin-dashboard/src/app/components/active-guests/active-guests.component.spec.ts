import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveGuestsComponent } from './active-guests.component';

describe('ActiveGuestsComponent', () => {
  let component: ActiveGuestsComponent;
  let fixture: ComponentFixture<ActiveGuestsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveGuestsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ActiveGuestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
