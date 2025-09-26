import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("rate_limit_rules")
@Index(["endpoint", "method"], { unique: true }) // One rule per endpoint+method combo
export class RateLimitRuleEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  // Human readable name like "Update video Limit"
  @Column({ length: 255 })
  name: string;

  // "/api/update", e.g.
  @Column({ length: 255 })
  endpoint: string;

  // GET, POST, PUT, DELETE or * for all
  @Column({ length: 100 })
  method: string;

  // Maximum requests allowed
  @Column("integer")
  requests: number;

  // Time window like "1m", "1h", "1d"
  @Column({ length: 10 })
  window: string;

  // How to identify the user
  @Column({
    type: "enum",
    enum: ["user-id", "ip", "api-key"],
    default: "user-id",
  })
  identifier: string;

  // Allow disabling rules without deleting
  @Column({ default: true })
  enabled: boolean;

  // Store extra config like skip conditions
  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updateAt: Date;
}
