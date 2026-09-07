import { Directive, ElementRef, Input, OnChanges, SimpleChanges, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appCountUp]',
  standalone: true
})
export class CountUpDirective implements OnChanges {
  @Input('appCountUp') countTo: number = 0;
  @Input() duration: number = 1500;
  @Input() prefix: string = '';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['countTo']) {
      this.animateCount();
    }
  }

  private animateCount() {
    let startTimestamp: number | null = null;
    const startValue = 0; // Always start from 0 for the ticker effect
    const endValue = this.countTo || 0;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / this.duration, 1);
      
      // easeOutQuad (slower initial burst than easeOutExpo, more visible)
      const easeProgress = progress * (2 - progress);
      
      const currentCount = Math.floor(easeProgress * (endValue - startValue) + startValue);
      
      this.renderer.setProperty(this.el.nativeElement, 'innerHTML', `${this.prefix}${currentCount.toLocaleString()}`);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        this.renderer.setProperty(this.el.nativeElement, 'innerHTML', `${this.prefix}${endValue.toLocaleString()}`);
      }
    };
    window.requestAnimationFrame(step);
  }
}
