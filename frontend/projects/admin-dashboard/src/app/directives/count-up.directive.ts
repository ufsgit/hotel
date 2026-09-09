import { Directive, ElementRef, Input, OnChanges, SimpleChanges, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appCountUp]',
  standalone: true
})
export class CountUpDirective implements OnChanges {
  @Input('appCountUp') countTo: number | string = 0;
  @Input() duration: number = 1500;
  @Input() prefix: string = '';
  @Input() decimals: number = 0;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['countTo']) {
      this.animateCount();
    }
  }

  private animateCount() {
    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = Number(this.countTo) || 0;

    const formatNumber = (num: number): string => {
      if (this.decimals > 0) {
        return num.toLocaleString('en-US', {
          minimumFractionDigits: this.decimals,
          maximumFractionDigits: this.decimals
        });
      }
      return num.toLocaleString('en-US');
    };

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / this.duration, 1);
      
      // easeOutQuad (slower initial burst than easeOutExpo, more visible)
      const easeProgress = progress * (2 - progress);
      
      const factor = Math.pow(10, this.decimals);
      const currentCount = Math.round((easeProgress * (endValue - startValue) + startValue) * factor) / factor;
      
      this.renderer.setProperty(this.el.nativeElement, 'innerHTML', `${this.prefix}${formatNumber(currentCount)}`);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        this.renderer.setProperty(this.el.nativeElement, 'innerHTML', `${this.prefix}${formatNumber(endValue)}`);
      }
    };
    window.requestAnimationFrame(step);
  }
}
