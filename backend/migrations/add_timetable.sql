-- Create timetables table
CREATE TABLE IF NOT EXISTS timetables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    day_of_week INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    INDEX idx_class_id (class_id),
    INDEX idx_day_time (day_of_week, start_time)
);

-- Create subject_colors table
CREATE TABLE IF NOT EXISTS subject_colors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_id INT UNIQUE NOT NULL,
    color_code VARCHAR(7) NOT NULL,
    text_color VARCHAR(7) DEFAULT '#FFFFFF' NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    INDEX idx_subject_id (subject_id)
);
