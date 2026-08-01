from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.item import Item
from pydantic import BaseModel
from typing import List

router = APIRouter()


class ItemCreate(BaseModel):
    name: str
    description: str = ""


class ItemResponse(BaseModel):
    id: int
    name: str
    description: str

    class Config:
        from_attributes = True


@router.get("/", response_model=List[ItemResponse])
def list_items(db: Session = Depends(get_db)):
    return db.query(Item).all()


@router.post("/", response_model=ItemResponse, status_code=201)
def create_item(payload: ItemCreate, db: Session = Depends(get_db)):
    item = Item(name=payload.name, description=payload.description)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item
