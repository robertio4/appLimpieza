-- Limpieza App - Seed Data
-- This file contains sample data for development and testing purposes
--
-- IMPORTANT: Before running this seed, you need a user in auth.users
-- You can create a test user through Supabase Auth or use an existing user
-- Replace the placeholder user_id below with the actual user UUID

-- Sample user ID (replace with actual user UUID from auth.users)
-- To get your user ID: SELECT id FROM auth.users LIMIT 1;
DO $$
DECLARE
    test_user_id UUID;
    cliente1_id UUID;
    cliente2_id UUID;
    cliente3_id UUID;
    factura1_id UUID;
    factura2_id UUID;
    cat_limpieza_id UUID;
    cat_transporte_id UUID;
    cat_suministros_id UUID;
    cat_marketing_id UUID;
BEGIN
    -- Get the first user from auth.users (for development)
    -- In production, you would use specific user IDs
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;

    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No user found in auth.users. Please create a user first.';
        RETURN;
    END IF;

    -- =============================================================================
    -- EXPENSE CATEGORIES (4 categories)
    -- =============================================================================

    INSERT INTO categorias_gasto (id, user_id, nombre, color)
    VALUES
        (uuid_generate_v4(), test_user_id, 'Productos de Limpieza', '#3B82F6')
    RETURNING id INTO cat_limpieza_id;

    INSERT INTO categorias_gasto (id, user_id, nombre, color)
    VALUES
        (uuid_generate_v4(), test_user_id, 'Transporte', '#10B981')
    RETURNING id INTO cat_transporte_id;

    INSERT INTO categorias_gasto (id, user_id, nombre, color)
    VALUES
        (uuid_generate_v4(), test_user_id, 'Suministros de Oficina', '#F59E0B')
    RETURNING id INTO cat_suministros_id;

    INSERT INTO categorias_gasto (id, user_id, nombre, color)
    VALUES
        (uuid_generate_v4(), test_user_id, 'Marketing y Publicidad', '#EF4444')
    RETURNING id INTO cat_marketing_id;

    RAISE NOTICE 'Created 4 expense categories';

    -- =============================================================================
    -- CLIENTS (3 clients)
    -- =============================================================================

    INSERT INTO clientes (id, user_id, nombre, email, telefono, direccion, nif, notas)
    VALUES (
        uuid_generate_v4(),
        test_user_id,
        'Oficinas Central Madrid S.L.',
        'contacto@centralesmadrid.es',
        '+34 912 345 678',
        'Calle Gran Vía 45, 3º Planta, 28013 Madrid',
        'B12345678',
        'Cliente preferente. Limpieza diaria de oficinas de 500m²'
    )
    RETURNING id INTO cliente1_id;

    INSERT INTO clientes (id, user_id, nombre, email, telefono, direccion, nif, notas)
    VALUES (
        uuid_generate_v4(),
        test_user_id,
        'Comunidad de Propietarios Los Robles',
        'administrador@losrobles.com',
        '+34 915 678 901',
        'Avenida de los Robles 12, 28024 Madrid',
        'H87654321',
        'Limpieza de zonas comunes 3 veces por semana'
    )
    RETURNING id INTO cliente2_id;

    INSERT INTO clientes (id, user_id, nombre, email, telefono, direccion, nif, notas)
    VALUES (
        uuid_generate_v4(),
        test_user_id,
        'Restaurante El Buen Sabor',
        'gerencia@elbuensabor.es',
        '+34 916 789 012',
        'Plaza Mayor 8, 28012 Madrid',
        'B98765432',
        'Limpieza nocturna después del cierre. Cocina + salón'
    )
    RETURNING id INTO cliente3_id;

    RAISE NOTICE 'Created 3 clients';

    -- =============================================================================
    -- INVOICES (2 invoices with lines)
    -- =============================================================================

    -- Invoice 1: For client 1
    INSERT INTO facturas (id, user_id, numero, cliente_id, fecha, fecha_vencimiento, subtotal, iva, total, estado, notas)
    VALUES (
        uuid_generate_v4(),
        test_user_id,
        generate_invoice_number(test_user_id),
        cliente1_id,
        CURRENT_DATE - INTERVAL '15 days',
        CURRENT_DATE + INTERVAL '15 days',
        850.00,
        21,
        1028.50,
        'enviada',
        'Servicios de limpieza enero 2026'
    )
    RETURNING id INTO factura1_id;

    -- Invoice 1 lines
    INSERT INTO lineas_factura (factura_id, concepto, cantidad, precio_unitario, total)
    VALUES
        (factura1_id, 'Limpieza diaria de oficinas (20 días)', 20, 35.00, 700.00),
        (factura1_id, 'Limpieza de cristales exteriores', 1, 100.00, 100.00),
        (factura1_id, 'Tratamiento especial de suelos', 1, 50.00, 50.00);

    -- Invoice 2: For client 3
    INSERT INTO facturas (id, user_id, numero, cliente_id, fecha, fecha_vencimiento, subtotal, iva, total, estado, notas)
    VALUES (
        uuid_generate_v4(),
        test_user_id,
        generate_invoice_number(test_user_id),
        cliente3_id,
        CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '25 days',
        420.00,
        21,
        508.20,
        'borrador',
        'Servicios de limpieza nocturna restaurante'
    )
    RETURNING id INTO factura2_id;

    -- Invoice 2 lines
    INSERT INTO lineas_factura (factura_id, concepto, cantidad, precio_unitario, total)
    VALUES
        (factura2_id, 'Limpieza nocturna (12 noches)', 12, 30.00, 360.00),
        (factura2_id, 'Desengrase profundo cocina', 1, 60.00, 60.00);

    RAISE NOTICE 'Created 2 invoices with lines';

    -- =============================================================================
    -- EXPENSES (5 expenses)
    -- =============================================================================

    INSERT INTO gastos (user_id, fecha, concepto, categoria_id, importe, proveedor, notas)
    VALUES
        (
            test_user_id,
            CURRENT_DATE - INTERVAL '20 days',
            'Productos de limpieza profesional',
            cat_limpieza_id,
            245.50,
            'Distribuciones Limpro S.L.',
            'Pedido mensual: detergentes, desinfectantes, ambientadores'
        ),
        (
            test_user_id,
            CURRENT_DATE - INTERVAL '15 days',
            'Gasolina vehículo empresa',
            cat_transporte_id,
            85.00,
            'Repsol',
            'Depósito completo - furgoneta de servicio'
        ),
        (
            test_user_id,
            CURRENT_DATE - INTERVAL '10 days',
            'Material de oficina',
            cat_suministros_id,
            45.30,
            'Papelería García',
            'Folios, carpetas, bolígrafos'
        ),
        (
            test_user_id,
            CURRENT_DATE - INTERVAL '7 days',
            'Tarjetas de visita',
            cat_marketing_id,
            120.00,
            'Imprenta Rápida',
            '500 tarjetas de visita a color'
        ),
        (
            test_user_id,
            CURRENT_DATE - INTERVAL '3 days',
            'Guantes y mascarillas',
            cat_limpieza_id,
            68.90,
            'Distribuciones Limpro S.L.',
            'Material de protección para empleados'
        );

    RAISE NOTICE 'Created 5 expenses';

    RAISE NOTICE 'Seed data inserted successfully for user: %', test_user_id;

END $$;
