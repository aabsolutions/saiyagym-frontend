import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { AuthStore } from '../../core/auth/auth.store';
import { ChangePasswordCard } from './change-password-card';
import { ProfileStore } from './profile.store';

describe('ChangePasswordCard', () => {
  const store = { changePassword: vi.fn(() => Promise.resolve(true)) };

  beforeEach(() => {
    store.changePassword.mockClear();
    TestBed.configureTestingModule({
      imports: [
        ChangePasswordCard,
        TranslocoTestingModule.forRoot({
          langs: { es: {} },
          translocoConfig: { availableLangs: ['es'], defaultLang: 'es' },
        }),
      ],
      providers: [
        { provide: ProfileStore, useValue: store },
        { provide: AuthStore, useValue: { user: signal({ email: 'v@saiyan.dev' }) } },
      ],
    });
  });

  const setup = async () => {
    const fixture = TestBed.createComponent(ChangePasswordCard);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const [current, next, confirm] = [
      ...el.querySelectorAll<HTMLInputElement>('input[type="password"]'),
    ];
    const type = (input: HTMLInputElement, value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const submit = async () => {
      el.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      await fixture.whenStable();
    };
    return { fixture, current, next, confirm, type, submit };
  };

  it('does not submit when the confirmation does not match', async () => {
    const { current, next, confirm, type, submit } = await setup();
    type(current, 'old-password');
    type(next, 'new-password-1');
    type(confirm, 'new-password-2');
    await submit();
    expect(store.changePassword).not.toHaveBeenCalled();
  });

  it('sends only current + new password and clears the form on success', async () => {
    const { current, next, confirm, type, submit, fixture } = await setup();
    type(current, 'old-password');
    type(next, 'new-password-1');
    type(confirm, 'new-password-1');
    await submit();

    expect(store.changePassword).toHaveBeenCalledWith({
      currentPassword: 'old-password',
      newPassword: 'new-password-1',
    });
    await fixture.whenStable();
    expect([current.value, next.value, confirm.value]).toEqual(['', '', '']);
  });
});
