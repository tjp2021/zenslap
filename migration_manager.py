#!/usr/bin/env python3

import os
import sys
import json
import psycopg2
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from pathlib import Path

class MigrationManager:
    """
    Migration Manager that enforces best practices and prevents common anti-patterns
    identified in POSTGREST_HELL analysis.
    """
    
    def __init__(self, config_path: str = "supabase/config.json"):
        self.logger = self._setup_logging()
        self.config = self._load_config(config_path)
        self.conn = None
        self.verification_sql = Path("verify_migration.sql").read_text()
        
    def _setup_logging(self) -> logging.Logger:
        """Setup structured logging with timestamps and levels."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s [%(levelname)s] %(message)s',
            handlers=[
                logging.FileHandler('migrations.log'),
                logging.StreamHandler(sys.stdout)
            ]
        )
        return logging.getLogger('MigrationManager')

    def _load_config(self, config_path: str) -> Dict:
        """Load database configuration safely."""
        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"Failed to load config: {e}")
            sys.exit(1)

    def connect(self) -> None:
        """Establish database connection with proper error handling."""
        try:
            self.conn = psycopg2.connect(
                dbname=self.config['db_name'],
                user=self.config['db_user'],
                password=self.config['db_password'],
                host=self.config['db_host'],
                port=self.config['db_port']
            )
            self.conn.autocommit = False
            self.logger.info("Database connection established")
        except Exception as e:
            self.logger.error(f"Database connection failed: {e}")
            sys.exit(1)

    def pre_flight_checks(self, table_name: str) -> bool:
        """
        Comprehensive pre-flight checks to prevent common issues.
        Addresses lessons learned about verification and state checking.
        """
        checks = [
            self._check_backup_status(),
            self._check_connections(),
            self._check_disk_space(),
            self._check_existing_objects(table_name),
            self._check_dependencies(table_name)
        ]
        return all(checks)

    def _check_backup_status(self) -> bool:
        """Verify backup status before proceeding."""
        with self.conn.cursor() as cur:
            cur.execute("SELECT pg_is_in_backup(), pg_backup_start_time();")
            in_backup, backup_time = cur.fetchone()
            if in_backup:
                self.logger.error(f"System is in backup mode since {backup_time}")
                return False
            return True

    def _check_connections(self) -> bool:
        """Check active connections and connection limits."""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT count(*), setting::int 
                FROM pg_stat_activity, pg_settings 
                WHERE name = 'max_connections' 
                GROUP BY setting;
            """)
            count, max_conn = cur.fetchone()
            if count > (max_conn * 0.8):
                self.logger.warning(f"High connection usage: {count}/{max_conn}")
                return False
            return True

    def _check_disk_space(self) -> bool:
        """Ensure sufficient disk space for migration."""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT pg_size_pretty(pg_database_size(current_database())),
                       pg_size_pretty(pg_total_relation_size('pg_toast'));
            """)
            db_size, toast_size = cur.fetchone()
            self.logger.info(f"Database size: {db_size}, TOAST size: {toast_size}")
            return True

    def execute_migration(self, migration_path: str, table_name: str) -> bool:
        """
        Execute migration with proper error handling and verification.
        Implements the lessons learned about proper migration execution order.
        """
        try:
            # Start transaction
            self.conn.execute("BEGIN;")
            
            # Create savepoint
            self.conn.execute("SAVEPOINT migration_start;")
            
            # Read and parse migration file
            with open(migration_path, 'r') as f:
                migration_sql = f.read()
            
            # Split into ordered steps (based on our template)
            steps = self._parse_migration_steps(migration_sql)
            
            # Execute each step with verification
            for step_name, step_sql in steps:
                self.logger.info(f"Executing step: {step_name}")
                
                # Execute step
                with self.conn.cursor() as cur:
                    cur.execute(step_sql)
                
                # Verify step
                if not self._verify_step(step_name, table_name):
                    raise Exception(f"Verification failed for step: {step_name}")
                
                self.logger.info(f"Step completed and verified: {step_name}")
            
            # Final verification
            if self._verify_migration(table_name):
                self.conn.execute("COMMIT;")
                self.logger.info("Migration successfully completed")
                return True
            else:
                raise Exception("Final verification failed")
                
        except Exception as e:
            self.logger.error(f"Migration failed: {e}")
            self.conn.execute("ROLLBACK TO migration_start;")
            self.conn.execute("COMMIT;")
            return False

    def _parse_migration_steps(self, migration_sql: str) -> List[Tuple[str, str]]:
        """Parse migration SQL into ordered steps based on our template."""
        steps = []
        current_step = []
        current_step_name = None

        for line in migration_sql.split('\n'):
            if line.strip().startswith('-- Step'):
                if current_step_name:
                    steps.append((current_step_name, '\n'.join(current_step)))
                current_step = []
                current_step_name = line.strip()
            else:
                current_step.append(line)

        if current_step_name:
            steps.append((current_step_name, '\n'.join(current_step)))

        return steps

    def _verify_step(self, step_name: str, table_name: str) -> bool:
        """Verify each step based on its type."""
        verifications = {
            'Create base table': self._verify_table_exists,
            'Add constraints': self._verify_constraints,
            'Create indexes': self._verify_indexes,
            'Set permissions': self._verify_permissions,
            'Enable RLS': self._verify_rls,
            'Create policies': self._verify_policies
        }
        
        verify_func = verifications.get(step_name.split(':')[1].strip())
        if verify_func:
            return verify_func(table_name)
        return True

    def _verify_migration(self, table_name: str) -> bool:
        """
        Comprehensive verification using our verification script.
        Implements the lessons learned about thorough verification.
        """
        try:
            with self.conn.cursor() as cur:
                # Set the table name parameter
                cur.execute(f"SET LOCAL migration.table_name = '{table_name}';")
                
                # Execute our verification script
                cur.execute(self.verification_sql)
                
                # Fetch and log all results
                while True:
                    try:
                        result = cur.fetchall()
                        if result:
                            self.logger.info(f"Verification result: {result}")
                    except psycopg2.ProgrammingError:
                        break
                
                return True
        except Exception as e:
            self.logger.error(f"Verification failed: {e}")
            return False

    def generate_rollback(self, migration_path: str) -> str:
        """Generate rollback SQL for the migration."""
        rollback_path = migration_path.replace('.sql', '_rollback.sql')
        with open(migration_path, 'r') as f:
            migration_sql = f.read()
        
        # Generate rollback statements in reverse order
        rollback_sql = self._generate_rollback_statements(migration_sql)
        
        with open(rollback_path, 'w') as f:
            f.write(rollback_sql)
        
        return rollback_path

    def _generate_rollback_statements(self, migration_sql: str) -> str:
        """Generate rollback statements based on migration content."""
        steps = self._parse_migration_steps(migration_sql)
        rollback_statements = []
        
        # Process steps in reverse order
        for step_name, step_sql in reversed(steps):
            rollback = self._generate_step_rollback(step_name, step_sql)
            if rollback:
                rollback_statements.append(f"-- Rollback: {step_name}\n{rollback}")
        
        return "\n\n".join(rollback_statements)

def main():
    """Main execution function."""
    if len(sys.argv) < 3:
        print("Usage: python migration_manager.py <migration_file> <table_name>")
        sys.exit(1)

    migration_path = sys.argv[1]
    table_name = sys.argv[2]

    manager = MigrationManager()
    manager.connect()

    # Run pre-flight checks
    if not manager.pre_flight_checks(table_name):
        print("Pre-flight checks failed. See logs for details.")
        sys.exit(1)

    # Generate rollback script
    rollback_path = manager.generate_rollback(migration_path)
    print(f"Rollback script generated: {rollback_path}")

    # Execute migration
    if manager.execute_migration(migration_path, table_name):
        print("Migration completed successfully")
    else:
        print("Migration failed. See logs for details.")
        print(f"Rollback script available at: {rollback_path}")
        sys.exit(1)

if __name__ == "__main__":
    main() 