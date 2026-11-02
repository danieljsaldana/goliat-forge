CREATE TABLE IF NOT EXISTS requests (
  id char(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  owner_id varchar(128) NOT NULL,
  title varchar(140) NOT NULL CHECK(CHAR_LENGTH(title)>0),
  detail text NOT NULL CHECK(CHAR_LENGTH(detail)<=1200),
  status varchar(16) NOT NULL DEFAULT 'accepted' CHECK(status IN ('accepted','processed')),
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX requests_owner_created(owner_id,created_at)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE IF NOT EXISTS outbox (
  event_id char(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  request_id char(36) CHARACTER SET ascii COLLATE ascii_bin UNIQUE NOT NULL,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  published_at timestamp(3) NULL,
  attempts int NOT NULL DEFAULT 0,
  FOREIGN KEY(request_id) REFERENCES requests(id),
  INDEX outbox_pending(published_at,created_at)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE TABLE IF NOT EXISTS activities (
  event_id char(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  request_id char(36) CHARACTER SET ascii COLLATE ascii_bin UNIQUE NOT NULL,
  kind varchar(32) NOT NULL,
  created_at timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  FOREIGN KEY(request_id) REFERENCES requests(id)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
