import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateAuction } from './create-auction';

describe('CreateAuction', () => {
  let component: CreateAuction;
  let fixture: ComponentFixture<CreateAuction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateAuction]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateAuction);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
