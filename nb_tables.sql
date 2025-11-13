DELETE FROM plannings;


DELETE FROM plannings

WHERE agent_name ILIKE 'Semaine du%'
   OR agent_name = 'EMPLOI DU TEMPS'
   OR agent_name = 'PRENOMS';


   CREATE TABLE plannings_backup AS SELECT * FROM plannings;(sauvegarde avant de supprimer)

   ALTER TABLE plannings DROP COLUMN jour;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'plannings'; (verification stricture du table)

DELETE FROM plannings
WHERE (agent_name, semaine) IN (
  SELECT agent_name, semaine
  FROM plannings
  GROUP BY agent_name, semaine
  HAVING COUNT(*) > 1
)
AND id NOT IN (
  SELECT MIN(id)
  FROM plannings
  GROUP BY agent_name, semaine
); (supprimer le doublent)

SELECT agent_name, semaine, COUNT(*)
FROM plannings
GROUP BY agent_name, semaine
HAVING COUNT(*) > 1;(conrique pas doublage)


UPDATE plannings
SET month = ARRAY[
  CASE
    WHEN month::text LIKE '%06%' THEN 'juin'
    WHEN month::text LIKE '%07%' THEN 'juillet'
    WHEN month::text LIKE '%08%' THEN 'août'
    ELSE 'inconnu'
  END
]::text[];

CREATE OR REPLACE FUNCTION get_distinct_years()
RETURNS TABLE (year text) AS $$
  SELECT DISTINCT year
  FROM plannings
  ORDER BY year;
$$ LANGUAGE SQL;


CREATE OR REPLACE FUNCTION public.get_distinct_months()
RETURNS TABLE (month text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT unnest(month) AS month
  FROM plannings
  ORDER BY month;
END;
$$ LANGUAGE plpgsql;



