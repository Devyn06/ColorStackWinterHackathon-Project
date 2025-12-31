import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserhomePage } from './userhome.page';

describe('UserhomePage', () => {
  let component: UserhomePage;
  let fixture: ComponentFixture<UserhomePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(UserhomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
