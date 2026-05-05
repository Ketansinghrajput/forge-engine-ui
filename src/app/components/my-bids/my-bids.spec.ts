import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyBids } from './my-bids';

describe('MyBids', () => {
  let component: MyBids;
  let fixture: ComponentFixture<MyBids>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyBids]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyBids);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
