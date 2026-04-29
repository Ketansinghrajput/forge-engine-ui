import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuctionDetail } from './auction-detail';

describe('AuctionDetail', () => {
  let component: AuctionDetail;
  let fixture: ComponentFixture<AuctionDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuctionDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuctionDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
