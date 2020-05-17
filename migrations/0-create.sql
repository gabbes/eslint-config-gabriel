-- up-migration
CREATE TABLE accounts (
  id CHAR (36) PRIMARY KEY,
  username VARCHAR (18) UNIQUE NOT NULL,
  password CHAR (32) NOT NULL,
  email VARCHAR (355) UNIQUE,
  created TIMESTAMPTZ NOT NULL
);

-- down-migration
DROP TABLE accounts;
