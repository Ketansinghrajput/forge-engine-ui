import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuctionLobby } from './auction-lobby';

describe('AuctionLobby', () => {
  let component: AuctionLobby;
  let fixture: ComponentFixture<AuctionLobby>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuctionLobby]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuctionLobby);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
