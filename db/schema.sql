PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS factories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  calendar_hours_per_day INTEGER NOT NULL DEFAULT 24 CHECK (calendar_hours_per_day BETWEEN 1 AND 24),
  shifts_per_day INTEGER NOT NULL DEFAULT 3 CHECK (shifts_per_day BETWEEN 1 AND 4),
  jipm_oee_target_pct REAL NOT NULL DEFAULT 85.0,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS shift_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  factory_id INTEGER NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  shift_number INTEGER NOT NULL CHECK (shift_number BETWEEN 1 AND 4),
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 480 CHECK (duration_minutes > 0),
  UNIQUE (factory_id, shift_number)
);

CREATE TABLE IF NOT EXISTS areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  factory_id INTEGER NOT NULL REFERENCES factories(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  environment_notes TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sequence_no INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS machines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  line_id INTEGER NOT NULL REFERENCES lines(id) ON DELETE RESTRICT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  machine_type TEXT NOT NULL DEFAULT 'Vertical Form Fill Seal (VFFS)',
  plc_model TEXT NOT NULL DEFAULT 'PLC-ABC',
  plc_ip TEXT NOT NULL,
  plc_port INTEGER NOT NULL DEFAULT 502 CHECK (plc_port BETWEEN 1 AND 65535),
  plc_protocol TEXT NOT NULL DEFAULT 'MODBUS_TCP' CHECK (plc_protocol IN ('MODBUS_TCP', 'MODBUS_RTU', 'OPC_UA', 'MQTT')),
  gateway_code TEXT NOT NULL DEFAULT 'GW-100',
  gateway_ip TEXT NOT NULL DEFAULT '192.168.10.10',
  hmi_code TEXT NOT NULL DEFAULT 'HMI-T7',
  buzzer_code TEXT NOT NULL DEFAULT 'BUZ-01',
  sealer_temp_setpoint_c REAL NOT NULL DEFAULT 165.0,
  sealer_temp_min_c REAL NOT NULL DEFAULT 155.0,
  sealer_temp_max_c REAL NOT NULL DEFAULT 185.0,
  vib_warning_mms REAL NOT NULL DEFAULT 4.5,
  vib_critical_mms REAL NOT NULL DEFAULT 7.1,
  minor_stop_threshold_sec INTEGER NOT NULL DEFAULT 300 CHECK (minor_stop_threshold_sec BETWEEN 30 AND 600),
  reduced_speed_threshold_pct REAL NOT NULL DEFAULT 91.2 CHECK (reduced_speed_threshold_pct BETWEEN 50.0 AND 100.0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sub_machines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sensor_tags TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (machine_id, code)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nik TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OPERATOR', 'SHIFT_LEADER', 'SPV', 'ADMIN_MANAGER', 'SUPERADMIN')),
  user_type TEXT NOT NULL CHECK (user_type IN ('PRODUCTION', 'TECHNICAL', 'MANAGEMENT', 'SYSTEM')),
  primary_area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL,
  primary_line_id INTEGER REFERENCES lines(id) ON DELETE SET NULL,
  primary_machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
  password_hash TEXT,
  hmi_pin_hash TEXT,
  failed_web_attempts INTEGER NOT NULL DEFAULT 0,
  web_locked_until TEXT,
  failed_hmi_attempts INTEGER NOT NULL DEFAULT 0,
  hmi_locked_until TEXT,
  theme_preference TEXT NOT NULL DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark')),
  can_release_reports INTEGER NOT NULL DEFAULT 0 CHECK (can_release_reports IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  last_login_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('WEB', 'HMI')),
  machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
  shift_number INTEGER CHECK (shift_number BETWEEN 1 AND 4),
  ip_address TEXT NOT NULL DEFAULT '127.0.0.1',
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS access_recovery_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('WEB_PASSWORD', 'HMI_PIN')),
  machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
  reset_token_hash TEXT,
  token_expires_at TEXT,
  reason_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'EXPIRED')),
  handled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS skus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  default_line_id INTEGER REFERENCES lines(id) ON DELETE SET NULL,
  packaging_type TEXT NOT NULL DEFAULT 'Sachet PE Primer',
  net_weight_grams REAL NOT NULL CHECK (net_weight_grams > 0),
  min_weight_grams REAL,
  max_weight_grams REAL,
  primary_unit TEXT NOT NULL DEFAULT 'pcs',
  secondary_unit TEXT NOT NULL DEFAULT 'inner',
  pcs_per_secondary INTEGER NOT NULL DEFAULT 10 CHECK (pcs_per_secondary >= 1),
  tertiary_unit TEXT NOT NULL DEFAULT 'karton',
  pcs_per_tertiary INTEGER NOT NULL DEFAULT 40 CHECK (pcs_per_tertiary >= 1),
  ideal_cycle_time_min REAL NOT NULL CHECK (ideal_cycle_time_min > 0),
  ideal_speed_pcs_per_min REAL NOT NULL CHECK (ideal_speed_pcs_per_min > 0),
  reduced_speed_trigger_pcs_per_min REAL NOT NULL CHECK (reduced_speed_trigger_pcs_per_min > 0),
  -- Nullable so financial FOL/FRL renders graceful fallback until Admin configures SKU price.
  unit_price_idr REAL CHECK (unit_price_idr IS NULL OR unit_price_idr >= 0),
  cogs_idr REAL CHECK (cogs_idr IS NULL OR cogs_idr >= 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS sku_machine_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku_id INTEGER NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  ideal_cycle_time_min REAL NOT NULL CHECK (ideal_cycle_time_min > 0),
  ideal_speed_pcs_per_min REAL NOT NULL CHECK (ideal_speed_pcs_per_min > 0),
  UNIQUE (sku_id, machine_id)
);

CREATE TABLE IF NOT EXISTS loss_categories (
  code TEXT PRIMARY KEY,
  pillar TEXT NOT NULL CHECK (pillar IN ('SCHEDULE', 'AVAILABILITY', 'PERFORMANCE', 'QUALITY')),
  name TEXT NOT NULL,
  six_big_loss_number INTEGER,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS downtime_reasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  loss_category_code TEXT NOT NULL REFERENCES loss_categories(code) ON DELETE RESTRICT,
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  default_plc_stop_code INTEGER,
  plc_register TEXT,
  recommended_actions_json TEXT NOT NULL DEFAULT '[]',
  is_planned INTEGER NOT NULL DEFAULT 0 CHECK (is_planned IN (0, 1)),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS quality_reasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  loss_category_code TEXT NOT NULL CHECK (loss_category_code IN ('L-05', 'L-06')),
  sku_id INTEGER REFERENCES skus(id) ON DELETE SET NULL,
  quality_type TEXT NOT NULL CHECK (quality_type IN ('REJECT', 'REWORK', 'SCRAP_K3')),
  name TEXT NOT NULL,
  sensor_source TEXT NOT NULL DEFAULT 'HMI_MANUAL' CHECK (sensor_source IN ('CNT-R01', 'SEN-T01', 'CHECKWEIGHER', 'HMI_MANUAL')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS guidelines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('SOP_OPERASIONAL', 'AUTONOMOUS_MAINTENANCE', 'TROUBLESHOOTING_PLC', 'USER_MANUAL')),
  area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL,
  machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('PDF', 'SCORM', 'MARKDOWN')),
  file_size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (file_size_bytes >= 0),
  content_markdown TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT 'v1.0',
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Mirrors the 13-word Modbus register map D000-D012 polled by GW-100 from PLC-ABC.
CREATE TABLE IF NOT EXISTS plc_register_states (
  machine_id INTEGER PRIMARY KEY REFERENCES machines(id) ON DELETE CASCADE,
  d000_status INTEGER NOT NULL DEFAULT 0 CHECK (d000_status IN (0, 1, 2, 3)),
  d001_stop_code INTEGER NOT NULL DEFAULT 0,
  d002_speed_pcs_min REAL NOT NULL DEFAULT 0.0,
  d003_good_count INTEGER NOT NULL DEFAULT 0,
  d004_auto_reject_count INTEGER NOT NULL DEFAULT 0,
  d005_sealer_temp_c REAL NOT NULL DEFAULT 28.0,
  d006_vibration_mms REAL NOT NULL DEFAULT 0.0,
  d007_hmi_defect_count INTEGER NOT NULL DEFAULT 0,
  d008_hmi_scrap_k3_count INTEGER NOT NULL DEFAULT 0,
  d009_minor_stop_flag INTEGER NOT NULL DEFAULT 0 CHECK (d009_minor_stop_flag IN (0, 1)),
  d010_auto_downtime_flag INTEGER NOT NULL DEFAULT 0 CHECK (d010_auto_downtime_flag IN (0, 1)),
  d011_buzzer_relay INTEGER NOT NULL DEFAULT 0 CHECK (d011_buzzer_relay IN (0, 1)),
  d012_heartbeat_seq INTEGER NOT NULL DEFAULT 0,
  connection_status TEXT NOT NULL DEFAULT 'ONLINE' CHECK (connection_status IN ('ONLINE', 'SYNCING', 'OFFLINE')),
  sync_progress_registers INTEGER NOT NULL DEFAULT 13 CHECK (sync_progress_registers BETWEEN 0 AND 13),
  diagnostic_message TEXT NOT NULL DEFAULT '',
  last_heartbeat_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS shift_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_code TEXT NOT NULL UNIQUE,
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  line_id INTEGER NOT NULL REFERENCES lines(id) ON DELETE RESTRICT,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE RESTRICT,
  report_date TEXT NOT NULL,
  shift_number INTEGER NOT NULL DEFAULT 1 CHECK (shift_number BETWEEN 0 AND 4),
  granularity TEXT NOT NULL DEFAULT 'SHIFT' CHECK (granularity IN ('SHIFT', 'DAILY', 'MONTHLY')),
  period_label TEXT NOT NULL,
  phase_tag TEXT NOT NULL DEFAULT 'LIVE' CHECK (phase_tag IN ('BASELINE_2022', 'POST_TPM_2023', 'LIVE')),
  calendar_minutes REAL NOT NULL DEFAULT 480.0,
  planned_downtime_minutes REAL NOT NULL DEFAULT 0.0,
  loading_minutes REAL NOT NULL CHECK (loading_minutes >= 0),
  breakdown_l01_minutes REAL NOT NULL DEFAULT 0.0,
  breakdown_l01_count INTEGER NOT NULL DEFAULT 0,
  setup_l02_minutes REAL NOT NULL DEFAULT 0.0,
  unplanned_downtime_minutes REAL NOT NULL DEFAULT 0.0,
  downtime_freq INTEGER NOT NULL DEFAULT 0,
  operating_minutes REAL NOT NULL DEFAULT 0.0,
  minor_stop_l03_minutes REAL NOT NULL DEFAULT 0.0,
  active_operating_minutes REAL NOT NULL DEFAULT 0.0,
  reduced_speed_l04_minutes REAL NOT NULL DEFAULT 0.0,
  net_operating_minutes REAL NOT NULL DEFAULT 0.0,
  defect_l05_minutes REAL NOT NULL DEFAULT 0.0,
  scrap_l06_minutes REAL NOT NULL DEFAULT 0.0,
  value_added_minutes REAL NOT NULL DEFAULT 0.0,
  target_production_pcs INTEGER NOT NULL DEFAULT 0,
  total_processed_pcs INTEGER NOT NULL DEFAULT 0,
  good_output_pcs INTEGER NOT NULL DEFAULT 0,
  defect_pcs INTEGER NOT NULL DEFAULT 0,
  scrap_k3_pcs INTEGER NOT NULL DEFAULT 0,
  rework_pcs INTEGER NOT NULL DEFAULT 0,
  avg_speed_pcs_min REAL NOT NULL DEFAULT 0.0,
  mttr_minutes REAL,
  mtbf_minutes REAL,
  availability_pct REAL NOT NULL DEFAULT 0.0,
  performance_pct REAL NOT NULL DEFAULT 0.0,
  quality_pct REAL NOT NULL DEFAULT 0.0,
  oee_pct REAL NOT NULL DEFAULT 0.0,
  teep_pct REAL NOT NULL DEFAULT 0.0,
  utility_pct REAL NOT NULL DEFAULT 0.0,
  achievement_pct REAL NOT NULL DEFAULT 0.0,
  timeline_segments_json TEXT NOT NULL DEFAULT '[]',
  approval_status TEXT NOT NULL DEFAULT 'NEEDS_APPROVAL' CHECK (approval_status IN ('NEEDS_APPROVAL', 'APPROVED', 'RELEASED')),
  submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TEXT,
  released_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  released_at TEXT,
  revision_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS production_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL UNIQUE,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE RESTRICT,
  sku_id INTEGER NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
  shift_report_id INTEGER REFERENCES shift_reports(id) ON DELETE SET NULL,
  production_date TEXT NOT NULL,
  shift_number INTEGER NOT NULL CHECK (shift_number BETWEEN 1 AND 4),
  target_qty_pcs INTEGER NOT NULL CHECK (target_qty_pcs > 0),
  total_processed_pcs INTEGER NOT NULL DEFAULT 0 CHECK (total_processed_pcs >= 0),
  good_qty_pcs INTEGER NOT NULL DEFAULT 0 CHECK (good_qty_pcs >= 0),
  auto_reject_pcs INTEGER NOT NULL DEFAULT 0 CHECK (auto_reject_pcs >= 0),
  manual_defect_pcs INTEGER NOT NULL DEFAULT 0 CHECK (manual_defect_pcs >= 0),
  scrap_k3_pcs INTEGER NOT NULL DEFAULT 0 CHECK (scrap_k3_pcs >= 0),
  rework_pcs INTEGER NOT NULL DEFAULT 0 CHECK (rework_pcs >= 0),
  status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED')),
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  ended_at TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS product_batch_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_code TEXT NOT NULL UNIQUE,
  shift_report_id INTEGER NOT NULL REFERENCES shift_reports(id) ON DELETE CASCADE,
  production_order_id INTEGER REFERENCES production_orders(id) ON DELETE SET NULL,
  sku_id INTEGER NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE RESTRICT,
  period_label TEXT NOT NULL,
  report_date TEXT NOT NULL,
  shift_number INTEGER NOT NULL DEFAULT 1,
  loading_minutes REAL NOT NULL DEFAULT 0.0,
  operating_minutes REAL NOT NULL DEFAULT 0.0,
  target_pcs INTEGER NOT NULL DEFAULT 0,
  total_processed_pcs INTEGER NOT NULL DEFAULT 0,
  good_output_pcs INTEGER NOT NULL DEFAULT 0,
  good_output_cartons REAL NOT NULL DEFAULT 0.0,
  good_output_kg REAL NOT NULL DEFAULT 0.0,
  defect_pcs INTEGER NOT NULL DEFAULT 0,
  scrap_k3_pcs INTEGER NOT NULL DEFAULT 0,
  rework_pcs INTEGER NOT NULL DEFAULT 0,
  downtime_minutes REAL NOT NULL DEFAULT 0.0,
  downtime_freq INTEGER NOT NULL DEFAULT 0,
  availability_pct REAL NOT NULL DEFAULT 0.0,
  performance_pct REAL NOT NULL DEFAULT 0.0,
  quality_pct REAL NOT NULL DEFAULT 0.0,
  oee_pct REAL NOT NULL DEFAULT 0.0,
  approval_status TEXT NOT NULL DEFAULT 'NEEDS_APPROVAL' CHECK (approval_status IN ('NEEDS_APPROVAL', 'APPROVED', 'RELEASED')),
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TEXT,
  released_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  released_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS kaizen_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  kaizen_type TEXT NOT NULL CHECK (kaizen_type IN ('PRODUCTION', 'MAINTENANCE')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'REVISE')),
  verification_status TEXT NOT NULL DEFAULT 'NOT_OK' CHECK (verification_status IN ('NOT_OK', 'NOT_VERIFIED', 'OK')),
  area_id INTEGER NOT NULL REFERENCES areas(id) ON DELETE RESTRICT,
  line_id INTEGER NOT NULL REFERENCES lines(id) ON DELETE RESTRICT,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE RESTRICT,
  sub_machine_id INTEGER NOT NULL REFERENCES sub_machines(id) ON DELETE RESTRICT,
  fishbone_factor TEXT NOT NULL DEFAULT 'MESIN' CHECK (fishbone_factor IN ('MESIN', 'LINGKUNGAN', 'MANUSIA', 'METODE', 'MATERIAL')),
  criteria TEXT NOT NULL DEFAULT 'Losses Reduction',
  loss_category_code TEXT NOT NULL REFERENCES loss_categories(code) ON DELETE RESTRICT,
  issue_title TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  issue_docs_json TEXT NOT NULL DEFAULT '[]',
  assigned_department TEXT NOT NULL DEFAULT 'Maintenance',
  assigned_pic_ids_json TEXT NOT NULL DEFAULT '[]',
  reviewer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  start_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  root_cause TEXT NOT NULL DEFAULT '',
  solution_type TEXT CHECK (solution_type IS NULL OR solution_type IN ('PERMANENT', 'TEMPORARY')),
  improvement_description TEXT NOT NULL DEFAULT '',
  improvement_docs_json TEXT NOT NULL DEFAULT '[]',
  improvement_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  improvement_date TEXT,
  lead_time_days REAL,
  before_telemetry_json TEXT NOT NULL DEFAULT '{}',
  after_telemetry_json TEXT NOT NULL DEFAULT '{}',
  revision_reason TEXT NOT NULL DEFAULT '',
  verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  verified_at TEXT,
  source_channel TEXT NOT NULL DEFAULT 'HMI' CHECK (source_channel IN ('HMI', 'WEB')),
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  -- Enforces URS Section 17/18 state transitions and blocks invalid combinations like OPEN + OK.
  CHECK (
    (status = 'OPEN' AND verification_status = 'NOT_OK') OR
    (status = 'REVISE' AND verification_status = 'NOT_OK') OR
    (status = 'CLOSED' AND verification_status IN ('NOT_VERIFIED', 'OK'))
  )
);

CREATE TABLE IF NOT EXISTS kaizen_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kaizen_id INTEGER NOT NULL REFERENCES kaizen_tickets(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  comment_text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS downtime_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  downtime_code TEXT NOT NULL UNIQUE,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE RESTRICT,
  sub_machine_id INTEGER REFERENCES sub_machines(id) ON DELETE SET NULL,
  -- Nullable to capture losses occurring between active orders (Without No. Production).
  production_order_id INTEGER REFERENCES production_orders(id) ON DELETE SET NULL,
  shift_report_id INTEGER REFERENCES shift_reports(id) ON DELETE SET NULL,
  plc_trigger_register TEXT NOT NULL,
  plc_stop_code INTEGER NOT NULL DEFAULT 0,
  is_small_stop INTEGER NOT NULL DEFAULT 0 CHECK (is_small_stop IN (0, 1)),
  is_planned INTEGER NOT NULL DEFAULT 0 CHECK (is_planned IN (0, 1)),
  loss_category_code TEXT REFERENCES loss_categories(code) ON DELETE RESTRICT,
  reason_id INTEGER REFERENCES downtime_reasons(id) ON DELETE RESTRICT,
  detail_reason TEXT NOT NULL DEFAULT '',
  action_tags_json TEXT NOT NULL DEFAULT '[]',
  classification_status TEXT NOT NULL DEFAULT 'UNCLASSIFIED' CHECK (classification_status IN ('UNCLASSIFIED', 'CLASSIFIED')),
  buzzer_muted_at TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration_minutes REAL NOT NULL DEFAULT 0.0 CHECK (duration_minutes >= 0),
  input_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  last_corrected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  corrected_at TEXT,
  escalated_kaizen_id INTEGER REFERENCES kaizen_tickets(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS quality_loss_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE RESTRICT,
  production_order_id INTEGER REFERENCES production_orders(id) ON DELETE SET NULL,
  shift_report_id INTEGER REFERENCES shift_reports(id) ON DELETE SET NULL,
  quality_reason_id INTEGER NOT NULL REFERENCES quality_reasons(id) ON DELETE RESTRICT,
  loss_category_code TEXT NOT NULL CHECK (loss_category_code IN ('L-05', 'L-06')),
  quality_type TEXT NOT NULL CHECK (quality_type IN ('REJECT', 'REWORK', 'SCRAP_K3')),
  qty_actual_unit REAL NOT NULL CHECK (qty_actual_unit > 0),
  actual_unit_name TEXT NOT NULL DEFAULT 'pcs',
  qty_pcs INTEGER NOT NULL CHECK (qty_pcs > 0),
  weight_kg REAL NOT NULL CHECK (weight_kg >= 0),
  time_loss_minutes REAL NOT NULL CHECK (time_loss_minutes >= 0),
  source_channel TEXT NOT NULL DEFAULT 'HMI-T7' CHECK (source_channel IN ('CNT-R01', 'HMI-T7')),
  sealer_temp_c_snapshot REAL,
  recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  recorded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS hourly_telemetry_buckets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  production_order_id INTEGER REFERENCES production_orders(id) ON DELETE SET NULL,
  shift_report_id INTEGER REFERENCES shift_reports(id) ON DELETE CASCADE,
  bucket_date TEXT NOT NULL,
  shift_number INTEGER NOT NULL CHECK (shift_number BETWEEN 1 AND 4),
  hour_label TEXT NOT NULL,
  ideal_capacity_pcs INTEGER NOT NULL DEFAULT 2500,
  total_production_pcs INTEGER NOT NULL DEFAULT 0,
  good_production_pcs INTEGER NOT NULL DEFAULT 0,
  reject_pcs INTEGER NOT NULL DEFAULT 0,
  rework_scrap_pcs INTEGER NOT NULL DEFAULT 0,
  anomaly_pcs INTEGER NOT NULL DEFAULT 0,
  avg_speed_pcs_min REAL NOT NULL DEFAULT 0.0,
  avg_sealer_temp_c REAL NOT NULL DEFAULT 165.0,
  avg_vibration_mms REAL NOT NULL DEFAULT 2.0,
  operating_minutes REAL NOT NULL DEFAULT 60.0,
  minor_stop_minutes REAL NOT NULL DEFAULT 0.0,
  reduced_speed_minutes REAL NOT NULL DEFAULT 0.0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS edge_sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_device TEXT NOT NULL CHECK (source_device IN ('GW-100', 'HMI-T7')),
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  synced_at TEXT,
  sync_status TEXT NOT NULL DEFAULT 'BUFFERED' CHECK (sync_status IN ('BUFFERED', 'SYNCED', 'FAILED'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_code TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('STOP', 'REASON', 'PROD', 'QUALITY', 'SPEED', 'SENSOR', 'KAIZEN', 'REPORT', 'CONFIG', 'AUTH')),
  title TEXT NOT NULL,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_label TEXT NOT NULL,
  source_channel TEXT NOT NULL CHECK (source_channel IN ('GW-100', 'HMI-T7', 'WEB')),
  area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL,
  line_id INTEGER REFERENCES lines(id) ON DELETE SET NULL,
  machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
  shift_report_id INTEGER REFERENCES shift_reports(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  before_json TEXT,
  after_json TEXT,
  ip_address TEXT NOT NULL DEFAULT '127.0.0.1',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'WARNING', 'APPROVAL', 'KAIZEN', 'SECURITY')),
  tag_label TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_roles_json TEXT NOT NULL DEFAULT '[]',
  target_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL,
  machine_id INTEGER REFERENCES machines(id) ON DELETE SET NULL,
  cta_label TEXT NOT NULL,
  cta_route TEXT NOT NULL,
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  PRIMARY KEY (notification_id, user_id)
);

-- URS 19.2.21 requires PLC Start, End, and Duration to remain immutable once stamped by PLC-ABC.
CREATE TRIGGER IF NOT EXISTS trg_downtime_immutable_plc_times
BEFORE UPDATE ON downtime_events
FOR EACH ROW
WHEN NEW.start_time != OLD.start_time
  OR NEW.machine_id != OLD.machine_id
  OR NEW.plc_trigger_register != OLD.plc_trigger_register
  OR (OLD.end_time IS NOT NULL AND (NEW.end_time IS NULL OR NEW.end_time != OLD.end_time))
  OR (OLD.end_time IS NOT NULL AND ABS(NEW.duration_minutes - OLD.duration_minutes) > 0.0001)
BEGIN
  SELECT RAISE(ABORT, 'PLC timestamp Start, End, Duration, and Trigger Register are immutable');
END;

-- Released shift reports permanently lock all constituent downtime classifications.
CREATE TRIGGER IF NOT EXISTS trg_downtime_lock_on_released_shift
BEFORE UPDATE ON downtime_events
FOR EACH ROW
WHEN OLD.shift_report_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM shift_reports
    WHERE id = OLD.shift_report_id AND approval_status = 'RELEASED'
  )
BEGIN
  SELECT RAISE(ABORT, 'Downtime event is locked because its Shift Report has been RELEASED');
END;

CREATE TRIGGER IF NOT EXISTS trg_downtime_no_delete_on_released_shift
BEFORE DELETE ON downtime_events
FOR EACH ROW
WHEN OLD.shift_report_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM shift_reports
    WHERE id = OLD.shift_report_id AND approval_status = 'RELEASED'
  )
BEGIN
  SELECT RAISE(ABORT, 'Downtime event cannot be deleted from a RELEASED Shift Report');
END;

-- Audit trail records are strictly append-only across all roles including SuperAdmin.
CREATE TRIGGER IF NOT EXISTS trg_audit_logs_no_update
BEFORE UPDATE ON audit_logs
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Audit logs are append-only and cannot be modified');
END;

CREATE TRIGGER IF NOT EXISTS trg_audit_logs_no_delete
BEFORE DELETE ON audit_logs
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Audit logs are append-only and cannot be deleted');
END;

CREATE INDEX IF NOT EXISTS idx_machines_line ON machines(line_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_orders_machine_status ON production_orders(machine_id, status);
CREATE INDEX IF NOT EXISTS idx_downtime_machine_shift ON downtime_events(machine_id, shift_report_id, classification_status);
CREATE INDEX IF NOT EXISTS idx_quality_machine_shift ON quality_loss_events(machine_id, shift_report_id);
CREATE INDEX IF NOT EXISTS idx_shift_reports_lookup ON shift_reports(area_id, machine_id, report_date, granularity, approval_status);
CREATE INDEX IF NOT EXISTS idx_kaizen_lookup ON kaizen_tickets(machine_id, status, verification_status, kaizen_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_lookup ON audit_logs(category, machine_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
