-- Fix get_episode_rankings RPC to filter NULL donor_id
-- Anonymous donations (without login) should not appear in rankings

-- Update the function to exclude NULL donor_id
CREATE OR REPLACE FUNCTION get_episode_rankings(
  p_episode_id INT,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  rank BIGINT,
  donor_id UUID,
  donor_name VARCHAR,
  total_amount BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY SUM(d.amount) DESC) as rank,
    d.donor_id::UUID,
    d.donor_name::VARCHAR,
    SUM(d.amount)::BIGINT as total_amount
  FROM donations d
  WHERE d.episode_id = p_episode_id
    AND d.donor_id IS NOT NULL  -- Exclude anonymous donations
  GROUP BY d.donor_id, d.donor_name
  ORDER BY total_amount DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_episode_rankings IS '특정 회차의 후원 랭킹 조회 (익명 후원 제외, 기본 Top 50)';
