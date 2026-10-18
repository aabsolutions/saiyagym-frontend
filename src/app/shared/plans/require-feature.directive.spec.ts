import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AuthStore } from '../../core/auth/auth.store';
import { FeatureKey } from '../../core/plans/entitlements';
import { RequireFeatureDirective } from './require-feature.directive';

@Component({
  imports: [RequireFeatureDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="photos" *requireFeature="'progressPhotos'">photos</p>
    <p class="export" *requireFeature="'dataExport'; else locked">export</p>
    <ng-template #locked><p class="locked">locked</p></ng-template>
  `,
})
class Host {}

describe('RequireFeatureDirective', () => {
  const features = signal<Partial<Record<FeatureKey, boolean>>>({});

  beforeEach(() => {
    features.set({});
    TestBed.configureTestingModule({
      imports: [
        Host,
        TranslocoTestingModule.forRoot({
          langs: { es: {} },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: { hasFeature: (f: FeatureKey) => !!features()[f] } },
      ],
    });
  });

  const render = async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture;
  };

  it('shows the upgrade CTA (or the else template) when the plan lacks the feature', async () => {
    const el = (await render()).nativeElement as HTMLElement;
    expect(el.querySelector('.photos')).toBeNull();
    expect(el.querySelector('app-upgrade-cta')).not.toBeNull();
    expect(el.querySelector('.export')).toBeNull();
    expect(el.querySelector('.locked')).not.toBeNull();
  });

  it('shows the content when the plan has it, and follows plan changes', async () => {
    const fixture = await render();
    const el = fixture.nativeElement as HTMLElement;

    features.set({ progressPhotos: true, dataExport: true });
    await fixture.whenStable();

    expect(el.querySelector('.photos')).not.toBeNull();
    expect(el.querySelector('app-upgrade-cta')).toBeNull();
    expect(el.querySelector('.export')).not.toBeNull();
    expect(el.querySelector('.locked')).toBeNull();
  });
});
