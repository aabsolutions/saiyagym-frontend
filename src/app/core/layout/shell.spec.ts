import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AuthStore } from '../auth/auth.store';
import { PreferencesStore } from '../preferences/preferences.store';
import { Shell } from './shell';

describe('Shell', () => {
  const isAdmin = signal(false);

  beforeEach(async () => {
    isAdmin.set(false);
    await TestBed.configureTestingModule({
      imports: [
        Shell,
        TranslocoTestingModule.forRoot({
          langs: { es: { nav: { admin: 'Administración', routines: 'Rutinas' } } },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
          preloadLangs: true,
        }),
      ],
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: {
            isAdmin,
            displayName: signal('Vegeta'),
            plan: signal({ name: 'Premium' }),
            logout: vi.fn(),
            logoutAll: vi.fn(),
          },
        },
        {
          provide: PreferencesStore,
          useValue: {
            language: signal('es'),
            resolvedTheme: computed(() => 'light'),
            setLanguage: vi.fn(),
            toggleTheme: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  const navLabels = async () => {
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    return {
      labels: [...el.querySelectorAll('mat-nav-list [matListItemTitle]')].map((t) =>
        t.textContent?.trim(),
      ),
      user: el.querySelector('.user-panel')?.textContent,
    };
  };

  it('renders the translated nav and the user panel', async () => {
    const { labels, user } = await navLabels();
    expect(labels).toContain('Rutinas');
    expect(user).toContain('Vegeta');
    expect(user).toContain('Premium');
  });

  it('shows the admin entry only to admins', async () => {
    expect((await navLabels()).labels).not.toContain('Administración');
    isAdmin.set(true);
    expect((await navLabels()).labels).toContain('Administración');
  });
});
