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
    id SERIAL PRIMARY KEY,
    usage_date DATE NOT NULL UNIQUE,
    total_items INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE daily_inventory_usage_items (
    id BIGSERIAL PRIMARY KEY,

    usage_id BIGINT NOT NULL,
    inventory_id BIGINT NOT NULL,

    quantity INTEGER NOT NULL DEFAULT 0,

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

    CONSTRAINT unique_usage_inventory
        UNIQUE (usage_id, inventory_id)
);


CREATE TABLE customers (
    id BIGSERIAL PRIMARY KEY,

    customer_name VARCHAR(150) NOT NULL,
    contact VARCHAR(20) NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);




CREATE TABLE clothes_orders (
    id BIGSERIAL PRIMARY KEY,

    customer_id BIGINT NOT NULL,

    cloth_photo TEXT,
    note_photo TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    remainder_date DATE,
    delivery_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_clothes_orders_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_clothes_orders_status
        CHECK (status IN ('pending', 'ready', 'delivered'))
);