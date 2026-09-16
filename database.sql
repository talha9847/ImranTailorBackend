CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    cloth_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    buying_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE daily_inventory_usage (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    usage_date DATE NOT NULL UNIQUE,
    total_items INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE daily_inventory_usage_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,

    usage_id BIGINT NOT NULL,

    inventory_id BIGINT NOT NULL,

    quantity INT NOT NULL DEFAULT 0,

    buying_price DECIMAL(10,2) NOT NULL DEFAULT 0,

    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,

    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_usage_items_usage
        FOREIGN KEY (usage_id)
        REFERENCES daily_inventory_usage(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_usage_items_inventory
        FOREIGN KEY (inventory_id)
        REFERENCES inventory(id)
        ON DELETE RESTRICT,

    UNIQUE (usage_id, inventory_id)
);
