## Database Setup

### Option A — Local MySQL

**Step 1: Install MySQL**

Download and install [MySQL Community Server](https://dev.mysql.com/downloads/mysql/) and [MySQL Workbench](https://dev.mysql.com/downloads/workbench/) from the official website.

During installation:
- Set a username
- Set a strong password and save it
- Keep the default port `3306`

**Step 2: Create the database**

Open MySQL Workbench or a terminal and run:

```sql
CREATE DATABASE college_attendance;
```

**Step 3: Import the schema**

From the terminal (project root):

```bash
mysql -u your_username -p college_attendance < backend/queries.sql
```

Or using MySQL Workbench:
1. Connect to your local MySQL server
2. Select the `college_attendance` database
3. Open `backend/queries.sql` and execute its contents

---

### Option B — Docker

**Step 1: Start the container**

```bash
docker run --name college-mysql \
  -e MYSQL_ROOT_PASSWORD=your_root_password \
  -e MYSQL_USER=your_username \
  -e MYSQL_PASSWORD=your_password \
  -e MYSQL_DATABASE=college_attendance \
  -p 3306:3306 \
  -d mysql:8
```

> Replace `your_username`, `your_password`, and `your_root_password` with your own values and update your `.env` file accordingly.

**Step 2: Wait for the container to be ready**

```bash
docker exec college-mysql mysqladmin ping -u root -pyour_root_password --wait
```

**Step 3: Import the schema**

```bash
docker exec -i college-mysql mysql -u your_username -pyour_password college_attendance < backend/queries.sql
```

---

Both options result in a running MySQL instance on port `3306` with the `college_attendance` database ready to use.
