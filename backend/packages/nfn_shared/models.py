from datetime import datetime
from typing import Any
from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base

class User(Base):
    __tablename__ = "users"
    user_id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)

class Source(Base):
    __tablename__ = "sources"
    public_id = Column(String, primary_key=True, index=True)
    email = Column(String, nullable=False)
    source_type = Column(String, nullable=False)
    name = Column(String, nullable=False)
    wilaya = Column(String, nullable=False)
    commune = Column(String, nullable=False)
    gps_lat = Column(Float, nullable=False)
    gps_lng = Column(Float, nullable=False)
    phone = Column(String, nullable=True)
    races = Column(JSON, nullable=False, default=list) # List of strings
    herd_size = Column(Integer, nullable=False)
    availability_months = Column(JSON, nullable=False, default=list)
    status = Column(String, nullable=False)
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class Lot(Base):
    __tablename__ = "lots"
    lot_id = Column(String, primary_key=True, index=True)
    source_id = Column(String, ForeignKey("sources.public_id"), nullable=False)
    source_name = Column(String, nullable=False)
    observed_weight_kg = Column(Float, nullable=False)
    estimated_weight_kg = Column(Float, nullable=False)
    status = Column(String, nullable=False)
    cleanliness = Column(String, nullable=True)
    gps = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class FieldException(Base):
    __tablename__ = "field_exceptions"
    exception_id = Column(String, primary_key=True, index=True)
    source_id = Column(String, ForeignKey("sources.public_id"), nullable=False)
    reason = Column(String, nullable=False)
    note = Column(String, nullable=True)
    gps = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class DepotReceipt(Base):
    __tablename__ = "depot_receipts"
    lot_id = Column(String, ForeignKey("lots.lot_id"), primary_key=True)
    received_weight_kg = Column(Float, nullable=False)
    storage_zone = Column(String, nullable=False)
    arrival_condition = Column(String, nullable=False)
    discrepancy_reason = Column(String, nullable=True)
    delta_pct = Column(Float, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class Classification(Base):
    __tablename__ = "classifications"
    lot_id = Column(String, ForeignKey("lots.lot_id"), primary_key=True)
    classification = Column(String, nullable=False)
    vm_percent = Column(Float, nullable=False)
    fiber_state = Column(String, nullable=False)
    color = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class Shipment(Base):
    __tablename__ = "shipments"
    bdc_id = Column(String, primary_key=True, index=True)
    lot_ids = Column(JSON, nullable=False) # List[str]
    total_weight_kg = Column(Float, nullable=False)
    humidity_pct = Column(Float, nullable=False)
    laundry_name = Column(String, nullable=False)
    transporteur_email = Column(String, nullable=False)
    destination_email = Column(String, nullable=False)
    expected_delivery_at = Column(DateTime, nullable=False)
    pdf_url = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    alert_id = Column(String, primary_key=True, index=True)
    alert_type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    lot_id = Column(String, ForeignKey("lots.lot_id"), nullable=True)
    message = Column(String, nullable=False)
    actors = Column(JSON, nullable=False) # List[str]
    metadata_ = Column(JSON, nullable=False, default=dict)
    resolved_at = Column(DateTime, nullable=True)
    resolved_comment = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class EmailMessageLog(Base):
    __tablename__ = "email_messages"
    message_id = Column(String, primary_key=True, index=True)
    recipient = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class SystemCounter(Base):
    __tablename__ = "system_counters"
    name = Column(String, primary_key=True)
    value = Column(Integer, nullable=False, default=0)
